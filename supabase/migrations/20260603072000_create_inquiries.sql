create extension if not exists "pgcrypto";

do $$
begin
  create type public.inquiry_category as enum ('general', 'bug', 'account', 'partnership', 'other');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.inquiry_status as enum ('submitted', 'reviewing', 'resolved', 'rejected');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.inquiry_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  category public.inquiry_category not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_drafts_user_id_unique unique (user_id),
  constraint inquiry_drafts_nickname_not_blank check (length(trim(nickname)) > 0),
  constraint inquiry_drafts_subject_not_blank check (length(trim(subject)) > 0),
  constraint inquiry_drafts_subject_length check (char_length(subject) <= 20),
  constraint inquiry_drafts_message_not_blank check (length(trim(message)) > 0),
  constraint inquiry_drafts_message_length check (char_length(message) <= 1000)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  category public.inquiry_category not null,
  subject text not null,
  message text not null,
  status public.inquiry_status not null default 'submitted',
  admin_note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_nickname_not_blank check (length(trim(nickname)) > 0),
  constraint inquiries_subject_not_blank check (length(trim(subject)) > 0),
  constraint inquiries_subject_length check (char_length(subject) <= 20),
  constraint inquiries_message_not_blank check (length(trim(message)) > 0),
  constraint inquiries_message_length check (char_length(message) <= 1000)
);

comment on table public.inquiry_drafts is 'One editable inquiry/report draft per authenticated user.';
comment on table public.inquiries is 'Submitted inquiry/report tickets for later admin review.';
comment on column public.inquiries.admin_note is 'Internal admin memo. Do not expose to ordinary users.';

create index if not exists inquiry_drafts_user_id_idx
  on public.inquiry_drafts (user_id);

create index if not exists inquiries_user_id_created_at_idx
  on public.inquiries (user_id, created_at desc);

create index if not exists inquiries_status_created_at_idx
  on public.inquiries (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inquiry_drafts_updated_at on public.inquiry_drafts;
create trigger set_inquiry_drafts_updated_at
before update on public.inquiry_drafts
for each row
execute function public.set_updated_at();

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at
before update on public.inquiries
for each row
execute function public.set_updated_at();

create or replace function public.set_inquiry_draft_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_nickname text;
begin
  new.user_id = auth.uid();
  select p.nickname
    into profile_nickname
  from public.profiles p
  where p.id = auth.uid();

  if profile_nickname is null or length(trim(profile_nickname)) = 0 then
    raise exception 'Profile nickname is required.';
  end if;

  new.nickname = profile_nickname;
  return new;
end;
$$;

drop trigger if exists set_inquiry_draft_owner on public.inquiry_drafts;
create trigger set_inquiry_draft_owner
before insert or update on public.inquiry_drafts
for each row
execute function public.set_inquiry_draft_owner();

create or replace function public.set_inquiry_submitter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_nickname text;
begin
  if tg_op = 'INSERT' then
    new.user_id = auth.uid();
    select p.nickname
      into profile_nickname
    from public.profiles p
    where p.id = auth.uid();

    if profile_nickname is null or length(trim(profile_nickname)) = 0 then
      raise exception 'Profile nickname is required.';
    end if;

    new.nickname = profile_nickname;
    new.status = 'submitted';
    new.admin_note = null;
    new.handled_by = null;
    new.handled_at = null;
  elsif tg_op = 'UPDATE' and public.is_admin() then
    if new.status is distinct from old.status then
      new.handled_by = auth.uid();
      new.handled_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_inquiry_submitter on public.inquiries;
create trigger set_inquiry_submitter
before insert or update on public.inquiries
for each row
execute function public.set_inquiry_submitter();

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

alter table public.inquiry_drafts enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "Users can read own inquiry draft" on public.inquiry_drafts;
create policy "Users can read own inquiry draft"
on public.inquiry_drafts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own inquiry draft" on public.inquiry_drafts;
create policy "Users can insert own inquiry draft"
on public.inquiry_drafts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own inquiry draft" on public.inquiry_drafts;
create policy "Users can update own inquiry draft"
on public.inquiry_drafts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own inquiry draft" on public.inquiry_drafts;
create policy "Users can delete own inquiry draft"
on public.inquiry_drafts
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read own inquiries and admins can read all" on public.inquiries;
create policy "Users can read own inquiries and admins can read all"
on public.inquiries
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can submit inquiries" on public.inquiries;
create policy "Users can submit inquiries"
on public.inquiries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can update inquiries" on public.inquiries;
create policy "Admins can update inquiries"
on public.inquiries
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete inquiries" on public.inquiries;
create policy "Admins can delete inquiries"
on public.inquiries
for delete
to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.inquiry_drafts to authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;
