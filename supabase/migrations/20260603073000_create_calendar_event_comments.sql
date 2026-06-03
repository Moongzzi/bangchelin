create extension if not exists "pgcrypto";

create table if not exists public.calendar_event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  parent_id uuid references public.calendar_event_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_comments_content_not_blank check (length(trim(content)) > 0),
  constraint calendar_event_comments_content_length check (char_length(content) <= 500),
  constraint calendar_event_comments_parent_not_self check (parent_id is null or parent_id <> id)
);

comment on table public.calendar_event_comments is 'Calendar event comments. Supports one reply depth through parent_id.';
comment on column public.calendar_event_comments.parent_id is 'Null for comments. Set for replies. Replies cannot have replies.';

create index if not exists calendar_event_comments_event_id_created_at_idx
  on public.calendar_event_comments (event_id, created_at asc);

create index if not exists calendar_event_comments_parent_id_idx
  on public.calendar_event_comments (parent_id);

create index if not exists calendar_event_comments_user_id_idx
  on public.calendar_event_comments (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_event_comments_updated_at on public.calendar_event_comments;
create trigger set_calendar_event_comments_updated_at
before update on public.calendar_event_comments
for each row
execute function public.set_updated_at();

create or replace function public.set_calendar_event_comment_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_calendar_event_comment_owner on public.calendar_event_comments;
create trigger set_calendar_event_comment_owner
before insert on public.calendar_event_comments
for each row
execute function public.set_calendar_event_comment_owner();

create or replace function public.validate_calendar_event_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_event_id uuid;
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select c.event_id, c.parent_id
    into parent_event_id, parent_parent_id
  from public.calendar_event_comments c
  where c.id = new.parent_id;

  if parent_event_id is null then
    raise exception 'Parent comment does not exist.';
  end if;

  if parent_event_id <> new.event_id then
    raise exception 'Reply parent must belong to the same calendar event.';
  end if;

  if parent_parent_id is not null then
    raise exception 'Replies can only be added to top-level comments.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_calendar_event_comment_depth on public.calendar_event_comments;
create trigger validate_calendar_event_comment_depth
before insert or update on public.calendar_event_comments
for each row
execute function public.validate_calendar_event_comment_depth();

alter table public.calendar_event_comments enable row level security;

drop policy if exists "Authenticated users can read calendar event comments" on public.calendar_event_comments;
create policy "Authenticated users can read calendar event comments"
on public.calendar_event_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_comments.event_id
  )
);

drop policy if exists "Authenticated users can create calendar event comments" on public.calendar_event_comments;
create policy "Authenticated users can create calendar event comments"
on public.calendar_event_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_comments.event_id
  )
);

drop policy if exists "Comment owners and admins can update calendar event comments" on public.calendar_event_comments;
create policy "Comment owners and admins can update calendar event comments"
on public.calendar_event_comments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Comment owners event owners and admins can delete calendar event comments" on public.calendar_event_comments;
create policy "Comment owners event owners and admins can delete calendar event comments"
on public.calendar_event_comments
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.calendar_events e
    where e.id = calendar_event_comments.event_id
      and e.created_by = auth.uid()
  )
);

grant select, insert, update, delete on public.calendar_event_comments to authenticated;
