do $$
begin
  create type public.account_status as enum ('active', 'dormant');
exception
  when duplicate_object then null;
end;
$$;

alter table public.profiles
  add column if not exists account_status public.account_status not null default 'active',
  add column if not exists dormant_at timestamptz,
  add column if not exists dormant_by uuid references auth.users(id) on delete set null,
  add column if not exists reactivated_at timestamptz,
  add column if not exists reactivated_by uuid references auth.users(id) on delete set null;

comment on column public.profiles.account_status is 'Controls whether an approved account can use authenticated service features.';
comment on column public.profiles.dormant_at is 'Timestamp when the account was switched to dormant.';
comment on column public.profiles.dormant_by is 'User or admin who switched the account to dormant.';
comment on column public.profiles.reactivated_at is 'Timestamp when an admin restored the account to active.';
comment on column public.profiles.reactivated_by is 'Admin who restored the account to active.';

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

create or replace function public.is_active_account(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_not_dormant_account(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status <> 'dormant'
  );
$$;

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

  execute 'select exists(select 1 from public.profiles where id = $1 and role = ''admin'' and account_status = ''active'')'
    into result
    using auth.uid();

  return coalesce(result, false);
end;
$$;

drop function if exists public.get_login_auth_status(text);

create or replace function public.get_login_auth_status(p_username text)
returns table(
  auth_email text,
  approval_status public.signup_request_status,
  account_status public.account_status
)
language sql
security definer
set search_path = public
as $$
  select p.auth_email, p.approval_status, p.account_status
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
    and p.account_status = 'active'
  limit 1;
$$;

create or replace function public.set_my_account_dormant()
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  update public.profiles
     set account_status = 'dormant',
         dormant_at = now(),
         dormant_by = auth.uid(),
         reactivated_at = null,
         reactivated_by = null,
         last_seen_at = now(),
         updated_at = now()
   where id = auth.uid()
     and account_status = 'active'
   returning *;
end;
$$;

drop function if exists public.get_admin_user_summaries(integer);

create or replace function public.get_admin_user_summaries(
  p_online_window_minutes integer default 5
)
returns table (
  id uuid,
  username text,
  nickname text,
  email text,
  role text,
  approval_status public.signup_request_status,
  account_status public.account_status,
  dormant_at timestamptz,
  reactivated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  is_online boolean,
  activity_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.nickname,
    p.email,
    p.role::text,
    p.approval_status,
    p.account_status,
    p.dormant_at,
    p.reactivated_at,
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    u.last_sign_in_at,
    null::timestamptz as last_activity_at,
    p.account_status = 'active'
      and greatest(
        coalesce(p.last_seen_at, '-infinity'::timestamptz),
        coalesce(u.last_sign_in_at, '-infinity'::timestamptz)
      ) >= now() - make_interval(mins => greatest(1, least(coalesce(p_online_window_minutes, 5), 60))) as is_online,
    0::bigint as activity_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

create or replace function public.get_admin_user_summary(
  p_user_id uuid,
  p_online_window_minutes integer default 5
)
returns table (
  id uuid,
  username text,
  nickname text,
  email text,
  role text,
  approval_status public.signup_request_status,
  account_status public.account_status,
  dormant_at timestamptz,
  reactivated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  is_online boolean,
  activity_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.nickname,
    p.email,
    p.role::text,
    p.approval_status,
    p.account_status,
    p.dormant_at,
    p.reactivated_at,
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    u.last_sign_in_at,
    null::timestamptz as last_activity_at,
    p.account_status = 'active'
      and greatest(
        coalesce(p.last_seen_at, '-infinity'::timestamptz),
        coalesce(u.last_sign_in_at, '-infinity'::timestamptz)
      ) >= now() - make_interval(mins => greatest(1, least(coalesce(p_online_window_minutes, 5), 60))) as is_online,
    0::bigint as activity_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
    and p.id = p_user_id
  limit 1;
$$;

create or replace function public.admin_set_user_account_status(
  p_user_id uuid,
  p_account_status public.account_status
)
returns table (
  id uuid,
  username text,
  nickname text,
  email text,
  role text,
  approval_status public.signup_request_status,
  account_status public.account_status,
  dormant_at timestamptz,
  reactivated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  is_online boolean,
  activity_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change account status.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Admins cannot change their own account status.';
  end if;

  update public.profiles p
     set account_status = p_account_status,
         dormant_at = case when p_account_status = 'dormant' then now() else p.dormant_at end,
         dormant_by = case when p_account_status = 'dormant' then auth.uid() else p.dormant_by end,
         reactivated_at = case when p_account_status = 'active' then now() else null end,
         reactivated_by = case when p_account_status = 'active' then auth.uid() else null end,
         updated_at = now()
   where p.id = p_user_id;

  return query
  select *
  from public.get_admin_user_summary(p_user_id, 5);
end;
$$;

create or replace function public.log_user_activity(
  p_action_type text,
  p_method text default null,
  p_endpoint text default null,
  p_success boolean default true,
  p_http_status integer default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_request_payload jsonb default null,
  p_response_payload jsonb default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_user_agent text default null,
  p_page_path text default null,
  p_source text default 'client_rest'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to write user activity logs.';
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'Dormant accounts cannot use service features.';
  end if;

  update public.profiles
  set last_seen_at = now(),
      updated_at = now()
  where id = auth.uid();

  insert into public.user_activity_logs (
    user_id,
    action_type,
    source,
    method,
    endpoint,
    http_status,
    success,
    entity_type,
    entity_id,
    request_payload,
    response_payload,
    error_message,
    metadata,
    user_agent,
    page_path
  )
  values (
    auth.uid(),
    trim(p_action_type),
    coalesce(nullif(trim(p_source), ''), 'client_rest'),
    nullif(upper(trim(coalesce(p_method, ''))), ''),
    nullif(trim(coalesce(p_endpoint, '')), ''),
    p_http_status,
    coalesce(p_success, true),
    nullif(trim(coalesce(p_entity_type, '')), ''),
    nullif(trim(coalesce(p_entity_id, '')), ''),
    public.sanitize_activity_payload(p_request_payload),
    public.sanitize_activity_payload(p_response_payload),
    nullif(trim(coalesce(p_error_message, '')), ''),
    coalesce(public.sanitize_activity_payload(p_metadata), '{}'::jsonb),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    nullif(trim(coalesce(p_page_path, '')), '')
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

drop policy if exists "Dormant accounts cannot update profiles directly" on public.profiles;
create policy "Dormant accounts cannot update profiles directly"
on public.profiles
as restrictive
for update
to authenticated
using (public.is_not_dormant_account(auth.uid()) or public.is_admin())
with check (public.is_not_dormant_account(auth.uid()) or public.is_admin());

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and rowsecurity = true
      and tablename <> 'profiles'
      and tablename <> 'signup_requests'
  loop
    execute format('drop policy if exists "Dormant accounts cannot use service" on %I.%I', r.schemaname, r.tablename);
    execute format(
      'create policy "Dormant accounts cannot use service" on %I.%I as restrictive for all to authenticated using (public.is_active_account(auth.uid()) or public.is_admin()) with check (public.is_active_account(auth.uid()) or public.is_admin())',
      r.schemaname,
      r.tablename
    );
  end loop;
end;
$$;

grant execute on function public.is_active_account(uuid) to anon, authenticated;
grant execute on function public.is_not_dormant_account(uuid) to anon, authenticated;
grant execute on function public.get_login_auth_status(text) to anon, authenticated;
grant execute on function public.get_login_email(text) to anon, authenticated;
grant execute on function public.set_my_account_dormant() to authenticated;
grant execute on function public.get_admin_user_summaries(integer) to authenticated;
grant execute on function public.get_admin_user_summary(uuid, integer) to authenticated;
grant execute on function public.admin_set_user_account_status(uuid, public.account_status) to authenticated;

notify pgrst, 'reload schema';
