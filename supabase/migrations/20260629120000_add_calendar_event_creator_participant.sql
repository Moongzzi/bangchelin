create or replace function public.add_calendar_event_creator_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_nickname text;
begin
  select p.nickname
    into creator_nickname
  from public.profiles p
  where p.id = new.created_by;

  if creator_nickname is null or length(trim(creator_nickname)) = 0 then
    return new;
  end if;

  insert into public.calendar_event_participants (
    event_id,
    profile_id,
    display_name,
    status,
    sort_order
  )
  values (
    new.id,
    new.created_by,
    trim(creator_nickname),
    'confirmed',
    0
  )
  on conflict (event_id, profile_id)
  where profile_id is not null
  do update
  set display_name = excluded.display_name,
      status = 'confirmed',
      sort_order = least(public.calendar_event_participants.sort_order, excluded.sort_order);

  return new;
end;
$$;

drop trigger if exists add_calendar_event_creator_participant on public.calendar_events;
create trigger add_calendar_event_creator_participant
after insert on public.calendar_events
for each row
execute function public.add_calendar_event_creator_participant();

insert into public.calendar_event_participants (
  event_id,
  profile_id,
  display_name,
  status,
  sort_order
)
select
  e.id,
  e.created_by,
  trim(p.nickname),
  'confirmed',
  coalesce((
    select min(cep.sort_order) - 1
    from public.calendar_event_participants cep
    where cep.event_id = e.id
  ), 0)
from public.calendar_events e
join public.profiles p on p.id = e.created_by
where length(trim(p.nickname)) > 0
  and not exists (
    select 1
    from public.calendar_event_participants existing
    where existing.event_id = e.id
      and existing.profile_id = e.created_by
  )
on conflict (event_id, profile_id)
where profile_id is not null
do update
set display_name = excluded.display_name,
    status = 'confirmed',
    sort_order = least(public.calendar_event_participants.sort_order, excluded.sort_order);

do $$
declare
  event_id uuid;
begin
  for event_id in select id from public.calendar_events loop
    perform public.refresh_calendar_event_status(event_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
