create extension if not exists "pgcrypto";

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  source text not null default 'client_rest',
  method text,
  endpoint text,
  http_status integer,
  success boolean not null default true,
  entity_type text,
  entity_id text,
  request_payload jsonb,
  response_payload jsonb,
  before_data jsonb,
  after_data jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  page_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_activity_logs_action_type_not_blank check (length(trim(action_type)) > 0),
  constraint user_activity_logs_source_not_blank check (length(trim(source)) > 0),
  constraint user_activity_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

comment on table public.user_activity_logs is 'Central audit and achievement-ready user activity log. Client API calls are written through log_user_activity; table changes are written by database triggers.';
comment on column public.user_activity_logs.request_payload is 'Sanitized request body. Passwords, tokens, auth headers, and API keys are removed by the RPC.';
comment on column public.user_activity_logs.before_data is 'Sanitized previous row state for database-triggered update/delete logs.';
comment on column public.user_activity_logs.after_data is 'Sanitized next row state for database-triggered insert/update logs.';

create index if not exists user_activity_logs_user_created_at_idx
  on public.user_activity_logs (user_id, created_at desc);

create index if not exists user_activity_logs_action_created_at_idx
  on public.user_activity_logs (action_type, created_at desc);

create index if not exists user_activity_logs_entity_created_at_idx
  on public.user_activity_logs (entity_type, entity_id, created_at desc);

create index if not exists user_activity_logs_source_created_at_idx
  on public.user_activity_logs (source, created_at desc);

create index if not exists user_activity_logs_metadata_gin_idx
  on public.user_activity_logs using gin (metadata);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_activity_logs_updated_at on public.user_activity_logs;
create trigger set_user_activity_logs_updated_at
before update on public.user_activity_logs
for each row
execute function public.set_updated_at();

create or replace function public.sanitize_activity_payload(payload jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb;
begin
  if payload is null then
    return null;
  end if;

  if jsonb_typeof(payload) = 'object' then
    select coalesce(jsonb_object_agg(key, public.sanitize_activity_payload(value)), '{}'::jsonb)
      into result
    from jsonb_each(payload)
    where lower(key) not in (
      'access_token',
      'apikey',
      'api_key',
      'authorization',
      'auth_email',
      'password',
      'refresh_token',
      'token'
    );

    return result;
  end if;

  if jsonb_typeof(payload) = 'array' then
    select coalesce(jsonb_agg(public.sanitize_activity_payload(value)), '[]'::jsonb)
      into result
    from jsonb_array_elements(payload);

    return result;
  end if;

  return payload;
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

do $$
declare
  tracked_table text;
begin
  foreach tracked_table in array array[
    'profiles',
    'signup_requests',
    'inquiry_drafts',
    'inquiries',
    'guide_documents',
    'calendar_events',
    'calendar_event_participants',
    'calendar_event_comments',
    'lounge_contents',
    'lounge_content_nodes',
    'lounge_activity_logs',
    'lounge_rankings',
    'lounge_settings',
    'maze_quiz_sets',
    'maze_questions',
    'maze_question_answers',
    'maze_start_answers',
    'maze_attempts',
    'maze_answer_logs'
  ] loop
    if to_regclass('public.' || tracked_table) is not null then
      execute format('drop trigger if exists write_%I_activity_log on public.%I', tracked_table, tracked_table);
      execute format(
        'create trigger write_%I_activity_log after insert or update or delete on public.%I for each row execute function public.write_table_activity_log()',
        tracked_table,
        tracked_table
      );
    end if;
  end loop;
end;
$$;

alter table public.user_activity_logs enable row level security;

drop policy if exists "Users can read own activity logs" on public.user_activity_logs;
create policy "Users can read own activity logs"
on public.user_activity_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all activity logs" on public.user_activity_logs;
create policy "Admins can read all activity logs"
on public.user_activity_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "No direct user activity log writes" on public.user_activity_logs;
create policy "No direct user activity log writes"
on public.user_activity_logs
for insert
to authenticated
with check (false);

grant select on public.user_activity_logs to authenticated;
grant execute on function public.log_user_activity(
  text,
  text,
  text,
  boolean,
  integer,
  text,
  text,
  jsonb,
  jsonb,
  text,
  jsonb,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
