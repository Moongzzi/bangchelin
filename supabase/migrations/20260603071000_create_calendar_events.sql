create extension if not exists "pgcrypto";

do $$
begin
  create type public.calendar_event_status as enum ('recruiting', 'closed', 'done');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.calendar_event_category as enum ('escape', 'theater', 'boardgame', 'etc');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.calendar_location_region as enum ('seoul', 'gyeonggi', 'incheon');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  end_date date not null,
  start_time time not null default '00:00',
  end_time time not null default '23:59',
  status public.calendar_event_status not null default 'recruiting',
  category public.calendar_event_category not null default 'escape',
  location_region public.calendar_location_region,
  location_detail text not null default '',
  capacity integer not null default 1,
  external_guest_count integer not null default 0,
  description text,
  comments jsonb not null default '[]'::jsonb,
  is_all_day boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_date_order check (end_date >= start_date),
  constraint calendar_events_capacity_range check (capacity between 1 and 999),
  constraint calendar_events_external_guest_count_range check (external_guest_count between 0 and 999),
  constraint calendar_events_comments_array check (jsonb_typeof(comments) = 'array')
);

create table if not exists public.calendar_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_participants_display_name_not_blank check (length(trim(display_name)) > 0)
);

create index if not exists calendar_events_range_idx
  on public.calendar_events (start_date, end_date);

create index if not exists calendar_events_created_by_idx
  on public.calendar_events (created_by);

create index if not exists calendar_event_participants_event_id_idx
  on public.calendar_event_participants (event_id, sort_order);

create index if not exists calendar_event_participants_profile_id_idx
  on public.calendar_event_participants (profile_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

drop trigger if exists set_calendar_event_participants_updated_at on public.calendar_event_participants;
create trigger set_calendar_event_participants_updated_at
before update on public.calendar_event_participants
for each row
execute function public.set_updated_at();

create or replace function public.set_calendar_event_editor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_calendar_event_editor on public.calendar_events;
create trigger set_calendar_event_editor
before insert or update on public.calendar_events
for each row
execute function public.set_calendar_event_editor();

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  result boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  execute 'select exists(select 1 from public.profiles where id = $1 and role = ''admin'')'
    into result
    using auth.uid();

  return coalesce(result, false);
end;
$$;

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
  if auth.uid() is null or length(trim(p_keyword)) < 2 then
    return;
  end if;

  return query
  select p.id, p.nickname, p.avatar_url
  from public.profiles p
  where p.nickname ilike '%' || trim(p_keyword) || '%'
  order by p.nickname asc
  limit 10;
end;
$$;

alter table public.calendar_events enable row level security;
alter table public.calendar_event_participants enable row level security;

drop policy if exists "Authenticated users can read calendar events" on public.calendar_events;
create policy "Authenticated users can read calendar events"
on public.calendar_events
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create calendar events" on public.calendar_events;
create policy "Authenticated users can create calendar events"
on public.calendar_events
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Event owners and admins can update calendar events" on public.calendar_events;
create policy "Event owners and admins can update calendar events"
on public.calendar_events
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "Event owners and admins can delete calendar events" on public.calendar_events;
create policy "Event owners and admins can delete calendar events"
on public.calendar_events
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users can read calendar participants" on public.calendar_event_participants;
create policy "Authenticated users can read calendar participants"
on public.calendar_event_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_participants.event_id
  )
);

drop policy if exists "Event owners and admins can insert calendar participants" on public.calendar_event_participants;
create policy "Event owners and admins can insert calendar participants"
on public.calendar_event_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_participants.event_id
      and (e.created_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Event owners and admins can update calendar participants" on public.calendar_event_participants;
create policy "Event owners and admins can update calendar participants"
on public.calendar_event_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_participants.event_id
      and (e.created_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_participants.event_id
      and (e.created_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Event owners and admins can delete calendar participants" on public.calendar_event_participants;
create policy "Event owners and admins can delete calendar participants"
on public.calendar_event_participants
for delete
to authenticated
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_participants.event_id
      and (e.created_by = auth.uid() or public.is_admin())
  )
);

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.calendar_event_participants to authenticated;
grant execute on function public.search_calendar_participants(text) to authenticated;
