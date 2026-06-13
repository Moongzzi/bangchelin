alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc);

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
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    u.last_sign_in_at,
    max(l.created_at) as last_activity_at,
    greatest(
      coalesce(p.last_seen_at, '-infinity'::timestamptz),
      coalesce(u.last_sign_in_at, '-infinity'::timestamptz),
      coalesce(max(l.created_at), '-infinity'::timestamptz)
    ) >= now() - make_interval(mins => greatest(1, least(coalesce(p_online_window_minutes, 5), 60))) as is_online,
    count(l.id) as activity_count
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_activity_logs l on l.user_id = p.id
  where public.is_admin()
  group by
    p.id,
    p.username,
    p.nickname,
    p.email,
    p.role,
    p.approval_status,
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    u.last_sign_in_at
  order by p.created_at desc;
$$;

grant execute on function public.get_admin_user_summaries(integer) to authenticated;

create or replace function public.write_table_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb := null;
  after_row jsonb := null;
  row_id text := null;
  actor_id uuid := auth.uid();
begin
  if tg_table_name = 'user_activity_logs' then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'profiles'
    and tg_op = 'UPDATE'
    and (to_jsonb(new) - 'last_seen_at' - 'updated_at') = (to_jsonb(old) - 'last_seen_at' - 'updated_at')
  then
    return new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    before_row = public.sanitize_activity_payload(to_jsonb(old));
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    after_row = public.sanitize_activity_payload(to_jsonb(new));
  end if;

  row_id = coalesce(
    after_row->>'id',
    before_row->>'id',
    after_row->>'question_id',
    before_row->>'question_id',
    after_row->>'set_id',
    before_row->>'set_id'
  );

  insert into public.user_activity_logs (
    user_id,
    action_type,
    source,
    method,
    endpoint,
    success,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  )
  values (
    actor_id,
    tg_table_name || '.' || lower(tg_op),
    'db_trigger',
    tg_op,
    tg_table_schema || '.' || tg_table_name,
    true,
    tg_table_name,
    row_id,
    before_row,
    after_row,
    jsonb_build_object('schema', tg_table_schema, 'table', tg_table_name, 'operation', tg_op)
  );

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';
