alter table public.calendar_events
  add column if not exists closed_by_capacity boolean not null default false;

create or replace function public.set_calendar_event_derived_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed_count integer := 0;
  is_full boolean := false;
begin
  if new.id is not null then
    select count(*)
      into confirmed_count
    from public.calendar_event_participants cep
    where cep.event_id = new.id
      and cep.status = 'confirmed';
  end if;

  is_full := confirmed_count + coalesce(new.external_guest_count, 0) >= coalesce(new.capacity, 1);

  if new.end_date < (now() at time zone 'Asia/Seoul')::date then
    new.status = 'done';
    new.closed_by_capacity = false;
    return new;
  end if;

  if new.status = 'done' then
    new.closed_by_capacity = false;
    return new;
  end if;

  if new.status = 'closed' then
    if tg_op = 'UPDATE' and coalesce(old.closed_by_capacity, false) and not is_full then
      new.status = 'recruiting';
      new.closed_by_capacity = false;
      return new;
    end if;

    new.closed_by_capacity = coalesce(new.closed_by_capacity, false) and is_full;
    return new;
  end if;

  if new.status = 'recruiting' and is_full then
    new.status = 'closed';
    new.closed_by_capacity = true;
    return new;
  end if;

  new.closed_by_capacity = false;
  return new;
end;
$$;

drop trigger if exists set_calendar_event_derived_status on public.calendar_events;
create trigger set_calendar_event_derived_status
before insert or update on public.calendar_events
for each row
execute function public.set_calendar_event_derived_status();

create or replace function public.refresh_calendar_event_status(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.calendar_events%rowtype;
  confirmed_count integer;
  next_status public.calendar_event_status;
  next_closed_by_capacity boolean;
begin
  select *
    into event_record
  from public.calendar_events
  where id = p_event_id;

  if event_record.id is null then
    return;
  end if;

  select count(*)
    into confirmed_count
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and cep.status = 'confirmed';

  if event_record.end_date < (now() at time zone 'Asia/Seoul')::date then
    next_status = 'done';
    next_closed_by_capacity = false;
  elsif event_record.status = 'done' then
    next_status = 'done';
    next_closed_by_capacity = false;
  elsif confirmed_count + event_record.external_guest_count >= event_record.capacity
    and event_record.status = 'recruiting' then
    next_status = 'closed';
    next_closed_by_capacity = true;
  elsif event_record.status = 'closed'
    and event_record.closed_by_capacity
    and confirmed_count + event_record.external_guest_count < event_record.capacity then
    next_status = 'recruiting';
    next_closed_by_capacity = false;
  elsif event_record.status = 'closed'
    and event_record.closed_by_capacity
    and confirmed_count + event_record.external_guest_count >= event_record.capacity then
    next_status = 'closed';
    next_closed_by_capacity = true;
  else
    next_status = event_record.status;
    next_closed_by_capacity = false;
  end if;

  update public.calendar_events
  set status = next_status,
      closed_by_capacity = next_closed_by_capacity
  where id = p_event_id
    and (
      status is distinct from next_status
      or closed_by_capacity is distinct from next_closed_by_capacity
    );
end;
$$;

create or replace function public.refresh_calendar_event_status_after_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_calendar_event_status(old.event_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.event_id is distinct from new.event_id then
    perform public.refresh_calendar_event_status(old.event_id);
  end if;

  perform public.refresh_calendar_event_status(new.event_id);
  return new;
end;
$$;

drop trigger if exists refresh_calendar_event_status_after_participant_change on public.calendar_event_participants;
create trigger refresh_calendar_event_status_after_participant_change
after insert or update or delete on public.calendar_event_participants
for each row
execute function public.refresh_calendar_event_status_after_participant_change();

create or replace function public.join_calendar_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.calendar_events%rowtype;
  profile_nickname text;
  existing_participant_id uuid;
  confirmed_count integer;
  next_sort_order integer;
  next_status public.calendar_participant_status;
begin
  if auth.uid() is null then
    raise exception 'Login is required.';
  end if;

  perform public.refresh_calendar_event_status(p_event_id);

  select *
    into event_record
  from public.calendar_events
  where id = p_event_id
  for update;

  if event_record.id is null then
    raise exception 'Calendar event does not exist.';
  end if;

  if event_record.end_date < (now() at time zone 'Asia/Seoul')::date
    or event_record.status = 'done' then
    raise exception 'Ended events cannot accept participants.';
  end if;

  if event_record.status = 'closed' and not event_record.closed_by_capacity then
    raise exception 'This event is closed.';
  end if;

  if event_record.status not in ('recruiting', 'closed') then
    raise exception 'Only recruiting events can accept participants.';
  end if;

  select p.nickname
    into profile_nickname
  from public.profiles p
  where p.id = auth.uid();

  if profile_nickname is null or length(trim(profile_nickname)) = 0 then
    raise exception 'Profile nickname is required.';
  end if;

  select cep.id
    into existing_participant_id
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and (
      cep.profile_id = auth.uid()
      or (cep.profile_id is null and lower(trim(cep.display_name)) = lower(trim(profile_nickname)))
    )
  order by cep.created_at asc
  limit 1
  for update;

  if existing_participant_id is not null then
    update public.calendar_event_participants
    set profile_id = auth.uid(),
        display_name = profile_nickname
    where id = existing_participant_id;

    return;
  end if;

  select count(*)
    into confirmed_count
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and cep.status = 'confirmed';

  select coalesce(max(sort_order), -1) + 1
    into next_sort_order
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id;

  if confirmed_count + event_record.external_guest_count < event_record.capacity then
    next_status = 'confirmed';
  else
    next_status = 'waitlisted';
  end if;

  insert into public.calendar_event_participants (
    event_id,
    profile_id,
    display_name,
    status,
    sort_order
  )
  values (
    p_event_id,
    auth.uid(),
    profile_nickname,
    next_status,
    next_sort_order
  );
end;
$$;

create or replace function public.leave_calendar_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.calendar_events%rowtype;
  profile_nickname text;
  removed_status public.calendar_participant_status;
  confirmed_count integer;
  promoted_participant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login is required.';
  end if;

  select *
    into event_record
  from public.calendar_events
  where id = p_event_id
  for update;

  if event_record.id is null then
    raise exception 'Calendar event does not exist.';
  end if;

  select p.nickname
    into profile_nickname
  from public.profiles p
  where p.id = auth.uid();

  delete from public.calendar_event_participants cep
  where cep.id = (
    select target.id
    from public.calendar_event_participants target
    where target.event_id = p_event_id
      and (
        target.profile_id = auth.uid()
        or (
          target.profile_id is null
          and profile_nickname is not null
          and lower(trim(target.display_name)) = lower(trim(profile_nickname))
        )
      )
    order by target.created_at asc
    limit 1
    for update
  )
  returning cep.status
  into removed_status;

  if removed_status is distinct from 'confirmed' then
    perform public.refresh_calendar_event_status(p_event_id);
    return;
  end if;

  select count(*)
    into confirmed_count
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and cep.status = 'confirmed';

  if confirmed_count + event_record.external_guest_count >= event_record.capacity then
    perform public.refresh_calendar_event_status(p_event_id);
    return;
  end if;

  select cep.id
    into promoted_participant_id
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and cep.status = 'waitlisted'
  order by cep.created_at asc
  limit 1
  for update;

  if promoted_participant_id is not null then
    update public.calendar_event_participants
    set status = 'confirmed'
    where id = promoted_participant_id;
  end if;

  perform public.refresh_calendar_event_status(p_event_id);
end;
$$;

update public.calendar_events
set status = 'done',
    closed_by_capacity = false
where end_date < (now() at time zone 'Asia/Seoul')::date
  and (status <> 'done' or closed_by_capacity);

update public.calendar_events
set closed_by_capacity = false
where status <> 'closed'
  and closed_by_capacity;

do $$
declare
  event_id uuid;
begin
  for event_id in select id from public.calendar_events loop
    perform public.refresh_calendar_event_status(event_id);
  end loop;
end;
$$;

grant execute on function public.refresh_calendar_event_status(uuid) to authenticated;
grant execute on function public.join_calendar_event(uuid) to authenticated;
grant execute on function public.leave_calendar_event(uuid) to authenticated;

notify pgrst, 'reload schema';
