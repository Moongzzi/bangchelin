create or replace function public.create_calendar_event(
  p_client_request_id uuid,
  p_title text,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_status public.calendar_event_status,
  p_category public.calendar_event_category,
  p_location_region public.calendar_location_region,
  p_location_detail text,
  p_capacity integer,
  p_external_guest_count integer,
  p_description text,
  p_is_all_day boolean,
  p_participant_names text[] default array[]::text[]
)
returns table (event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_creator_nickname text;
  v_participant_name text;
  v_seen_names text[] := array[]::text[];
  v_sort_order integer := 1;
begin
  if auth.uid() is null then
    raise exception 'Login is required.';
  end if;

  if p_client_request_id is null then
    raise exception 'Client request id is required.';
  end if;

  select trim(p.nickname)
    into v_creator_nickname
  from public.profiles p
  where p.id = auth.uid();

  if v_creator_nickname is null or length(v_creator_nickname) = 0 then
    raise exception 'Profile nickname is required.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date cannot be earlier than start date.';
  end if;

  if p_capacity < 1 or p_capacity > 999 then
    raise exception 'Capacity must be between 1 and 999.';
  end if;

  if p_external_guest_count < 0 or p_external_guest_count > 999 then
    raise exception 'External guest count must be between 0 and 999.';
  end if;

  if p_external_guest_count + 1 > p_capacity then
    raise exception 'Participant count cannot exceed capacity.';
  end if;

  insert into public.calendar_events (
    client_request_id,
    title,
    start_date,
    end_date,
    start_time,
    end_time,
    status,
    category,
    location_region,
    location_detail,
    capacity,
    external_guest_count,
    description,
    is_all_day,
    created_by,
    updated_by
  )
  values (
    p_client_request_id,
    trim(p_title),
    p_start_date,
    p_end_date,
    p_start_time,
    p_end_time,
    p_status,
    p_category,
    p_location_region,
    coalesce(trim(p_location_detail), ''),
    p_capacity,
    p_external_guest_count,
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_is_all_day, false),
    auth.uid(),
    auth.uid()
  )
  on conflict (created_by, client_request_id)
  where client_request_id is not null
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select ce.id
      into v_event_id
    from public.calendar_events ce
    where ce.created_by = auth.uid()
      and ce.client_request_id = p_client_request_id
    limit 1;

    if v_event_id is null then
      raise exception 'Calendar event create result could not be resolved.';
    end if;

    event_id := v_event_id;
    return next;
    return;
  end if;

  delete from public.calendar_event_participants cep
  where cep.event_id = v_event_id;

  insert into public.calendar_event_participants (
    event_id,
    profile_id,
    display_name,
    status,
    sort_order
  )
  values (
    v_event_id,
    auth.uid(),
    v_creator_nickname,
    'confirmed',
    0
  );

  v_seen_names := array[lower(v_creator_nickname)];

  foreach v_participant_name in array coalesce(p_participant_names, array[]::text[]) loop
    v_participant_name := trim(v_participant_name);

    if v_participant_name is null
      or length(v_participant_name) = 0
      or lower(v_participant_name) = any(v_seen_names) then
      continue;
    end if;

    if p_external_guest_count + v_sort_order + 1 > p_capacity then
      raise exception 'Participant count cannot exceed capacity.';
    end if;

    insert into public.calendar_event_participants (
      event_id,
      profile_id,
      display_name,
      status,
      sort_order
    )
    values (
      v_event_id,
      null,
      v_participant_name,
      'confirmed',
      v_sort_order
    );

    v_seen_names := array_append(v_seen_names, lower(v_participant_name));
    v_sort_order := v_sort_order + 1;
  end loop;

  perform public.refresh_calendar_event_status(v_event_id);

  event_id := v_event_id;
  return next;
end;
$$;

grant execute on function public.create_calendar_event(
  uuid,
  text,
  date,
  date,
  time,
  time,
  public.calendar_event_status,
  public.calendar_event_category,
  public.calendar_location_region,
  text,
  integer,
  integer,
  text,
  boolean,
  text[]
) to authenticated;

notify pgrst, 'reload schema';
