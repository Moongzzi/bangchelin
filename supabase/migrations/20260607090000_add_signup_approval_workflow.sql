create extension if not exists "pgcrypto";

do $$
begin
  create type public.signup_request_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end;
$$;

alter table public.profiles
  add column if not exists approval_status public.signup_request_status not null default 'approved',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  auth_email text not null,
  nickname text not null,
  email text,
  birth_date date,
  introduction text,
  activity_region text,
  avatar_url text,
  status public.signup_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signup_requests_user_id_unique unique (user_id),
  constraint signup_requests_username_not_blank check (length(trim(username)) > 0),
  constraint signup_requests_auth_email_not_blank check (length(trim(auth_email)) > 0),
  constraint signup_requests_nickname_not_blank check (length(trim(nickname)) > 0)
);

comment on table public.signup_requests is 'Pending and reviewed signup requests for admin account approval.';
comment on column public.profiles.approval_status is 'Controls whether the app allows username/password login.';

create unique index if not exists signup_requests_username_lower_idx
  on public.signup_requests (lower(username));

create index if not exists signup_requests_status_requested_at_idx
  on public.signup_requests (status, requested_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_signup_requests_updated_at on public.signup_requests;
create trigger set_signup_requests_updated_at
before update on public.signup_requests
for each row
execute function public.set_updated_at();

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

  execute 'select exists(select 1 from public.profiles where id = $1 and role = ''admin'')'
    into result
    using auth.uid();

  return coalesce(result, false);
end;
$$;

create or replace function public.handle_new_signup_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_username text := nullif(trim(coalesce(metadata->>'username', split_part(new.email, '@', 1))), '');
  requested_nickname text := nullif(trim(coalesce(metadata->>'nickname', requested_username)), '');
  requested_auth_email text := nullif(trim(coalesce(metadata->>'auth_email', new.email)), '');
begin
  insert into public.signup_requests (
    user_id,
    username,
    auth_email,
    nickname,
    birth_date,
    introduction,
    activity_region,
    email,
    status
  )
  values (
    new.id,
    requested_username,
    requested_auth_email,
    requested_nickname,
    nullif(metadata->>'birth_date', '')::date,
    nullif(metadata->>'introduction', ''),
    nullif(metadata->>'activity_region', ''),
    nullif(metadata->>'email', ''),
    'pending'
  )
  on conflict (user_id) do nothing;

  update public.profiles
    set approval_status = 'pending',
        updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_signup_request on auth.users;
create trigger on_auth_user_created_signup_request
after insert on auth.users
for each row
execute function public.handle_new_signup_request();

create or replace function public.sync_signup_request_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not public.is_admin() then
      raise exception 'Only admins can review signup requests.';
    end if;

    if new.status in ('approved', 'rejected') then
      new.reviewed_by = auth.uid();
      new.reviewed_at = now();
    end if;
  end if;

  if new.status = 'approved' then
    new.rejection_reason = null;

    update public.profiles
      set approval_status = 'approved',
          approved_by = auth.uid(),
          approved_at = now(),
          rejected_by = null,
          rejected_at = null,
          rejection_reason = null,
          updated_at = now()
    where id = new.user_id;
  elsif new.status = 'rejected' then
    update public.profiles
      set approval_status = 'rejected',
          rejected_by = auth.uid(),
          rejected_at = now(),
          rejection_reason = new.rejection_reason,
          updated_at = now()
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_signup_request_review on public.signup_requests;
create trigger sync_signup_request_review
before update on public.signup_requests
for each row
execute function public.sync_signup_request_review();

create or replace function public.get_login_auth_status(p_username text)
returns table(auth_email text, approval_status public.signup_request_status)
language sql
security definer
set search_path = public
as $$
  select p.auth_email, p.approval_status
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

create or replace function public.get_login_email(p_username text)
returns table(auth_email text)
language sql
security definer
set search_path = public
as $$
  select p.auth_email
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
    and p.approval_status = 'approved'
  limit 1;
$$;

alter table public.signup_requests enable row level security;

drop policy if exists "Users can read own signup request and admins can read all" on public.signup_requests;
create policy "Users can read own signup request and admins can read all"
on public.signup_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own pending signup request" on public.signup_requests;
create policy "Users can update own pending signup request"
on public.signup_requests
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

grant select, update on public.signup_requests to authenticated;
grant execute on function public.get_login_auth_status(text) to anon, authenticated;
grant execute on function public.get_login_email(text) to anon, authenticated;
