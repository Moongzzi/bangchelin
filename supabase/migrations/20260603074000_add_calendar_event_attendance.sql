do $$
begin
  create type public.calendar_participant_status as enum ('confirmed', 'waitlisted');
exception
  when duplicate_object then null;
end;
$$;

alter table public.calendar_event_participants
  add column if not exists status public.calendar_participant_status not null default 'confirmed';

update public.calendar_event_participants cep
set profile_id = p.id
from public.profiles p
where cep.profile_id is null
  and lower(trim(cep.display_name)) = lower(trim(p.nickname));

delete from public.calendar_event_participants duplicated
using public.calendar_event_participants kept
where duplicated.event_id = kept.event_id
  and duplicated.profile_id = kept.profile_id
  and duplicated.profile_id is not null
  and duplicated.created_at > kept.created_at;

create unique index if not exists calendar_event_participants_event_profile_unique_idx
  on public.calendar_event_participants (event_id, profile_id)
  where profile_id is not null;

create index if not exists calendar_event_participants_event_status_created_at_idx
  on public.calendar_event_participants (event_id, status, created_at asc);

create or replace function public.set_calendar_event_participant_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_profile_id uuid;
begin
  if new.profile_id is null then
    select p.id
      into matched_profile_id
    from public.profiles p
    where lower(trim(p.nickname)) = lower(trim(new.display_name))
    limit 1;

    new.profile_id = matched_profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_calendar_event_participant_profile on public.calendar_event_participants;
create trigger set_calendar_event_participant_profile
before insert or update on public.calendar_event_participants
for each row
execute function public.set_calendar_event_participant_profile();

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

  select *
    into event_record
  from public.calendar_events
  where id = p_event_id
  for update;

  if event_record.id is null then
    raise exception 'Calendar event does not exist.';
  end if;

  if event_record.status <> 'recruiting' then
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
    return;
  end if;

  select count(*)
    into confirmed_count
  from public.calendar_event_participants cep
  where cep.event_id = p_event_id
    and cep.status = 'confirmed';

  if confirmed_count + event_record.external_guest_count >= event_record.capacity then
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
end;
$$;

grant execute on function public.join_calendar_event(uuid) to authenticated;
grant execute on function public.leave_calendar_event(uuid) to authenticated;

create or replace function public.search_calendar_participants(p_keyword text)
returns table (
  id uuid,
  nickname text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or length(trim(p_keyword)) < 1 then
    return;
  end if;

  return query
  select p.id, p.nickname, p.avatar_url
  from public.profiles p
  where p.nickname ilike '%' || trim(p_keyword) || '%'
  order by
    case
      when lower(p.nickname) = lower(trim(p_keyword)) then 0
      when lower(p.nickname) like lower(trim(p_keyword)) || '%' then 1
      else 2
    end,
    p.nickname asc
  limit 10;
end;
$$;

grant execute on function public.search_calendar_participants(text) to authenticated;

update public.calendar_events
set status = 'done'
where end_date < (now() at time zone 'Asia/Seoul')::date
  and status <> 'done';

notify pgrst, 'reload schema';
