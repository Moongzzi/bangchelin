create table if not exists public.lounge_event_configs (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null unique references public.lounge_contents(id) on delete cascade,
  opens_at timestamptz,
  closes_at timestamptz,
  target_route_path text,
  ranking_source text not null default 'maze',
  ranking_metric text not null default 'clear_order',
  ranking_target_id uuid,
  reward_rank_limit integer not null default 10,
  rank_condition_type text not null default 'top',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lounge_event_configs_reward_rank_limit_check check (reward_rank_limit > 0),
  constraint lounge_event_configs_rank_condition_type_check check (rank_condition_type in ('top', 'exact')),
  constraint lounge_event_configs_ranking_source_check check (ranking_source in ('maze')),
  constraint lounge_event_configs_ranking_metric_check check (ranking_metric in ('clear_order', 'elapsed_time')),
  constraint lounge_event_configs_window_check check (closes_at is null or opens_at is null or closes_at > opens_at)
);

comment on table public.lounge_event_configs
  is 'Short-term lounge event configuration. Events remain lounge contents and map nodes; this table controls open time and ranking condition.';

comment on column public.lounge_contents.metadata
  is 'Flexible lounge content metadata. Event pages may use descriptionBlocks as ordered text/image body blocks.';

alter table public.lounge_event_configs
  add column if not exists rank_condition_type text not null default 'top';

drop policy if exists "Public can read active lounge event configs" on public.lounge_event_configs;
drop policy if exists "Public can read lounge event configs" on public.lounge_event_configs;

alter table public.lounge_event_configs
  drop column if exists is_active;

alter table public.lounge_event_configs
  drop constraint if exists lounge_event_configs_rank_condition_type_check;

alter table public.lounge_event_configs
  add constraint lounge_event_configs_rank_condition_type_check
  check (rank_condition_type in ('top', 'exact'));

drop index if exists public.lounge_event_configs_active_open_idx;
drop index if exists public.maze_attempts_set_clear_order_idx;
drop index if exists public.maze_attempts_set_elapsed_idx;

create index if not exists lounge_event_configs_open_idx
  on public.lounge_event_configs (opens_at);

alter table public.lounge_event_configs enable row level security;

create policy "Public can read lounge event configs"
on public.lounge_event_configs
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.lounge_contents c
    where c.id = lounge_event_configs.content_id
      and c.status = 'published'
      and c.access_level in ('public', 'member')
  )
);

drop policy if exists "Admins manage lounge event configs" on public.lounge_event_configs;
create policy "Admins manage lounge event configs"
on public.lounge_event_configs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists maze_attempts_set_clear_order_idx
  on public.maze_attempts (set_id, clear_rank asc, cleared_at asc)
  where cleared_at is not null;

create index if not exists maze_attempts_set_elapsed_idx
  on public.maze_attempts (set_id, total_elapsed_seconds asc, cleared_at asc)
  where cleared_at is not null;

drop function if exists public.restart_maze_attempt(uuid);
create or replace function public.restart_maze_attempt(p_set_id uuid)
returns table (
  id uuid,
  set_id uuid,
  user_id uuid,
  status public.maze_attempt_status,
  current_question_no integer,
  started_at timestamptz,
  cleared_at timestamptz,
  total_elapsed_seconds integer,
  clear_rank integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.maze_attempts;
  v_start_question_no integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select case when s.has_start_page then 0 else 1 end
  into v_start_question_no
  from public.maze_quiz_sets as s
  where s.id = p_set_id
    and s.status = 'published';

  if v_start_question_no is null then
    raise exception 'Maze set is not available';
  end if;

  if not exists (select 1 from public.profiles as p where p.id = auth.uid()) then
    raise exception 'Profile not found for current user';
  end if;

  if not exists (select 1 from public.maze_questions as q where q.set_id = p_set_id) then
    raise exception 'Maze questions are not configured';
  end if;

  insert into public.maze_attempts (set_id, user_id, status, current_question_no, started_at)
  values (p_set_id, auth.uid(), 'in_progress', v_start_question_no, now())
  on conflict on constraint maze_attempts_set_id_user_id_key do update
  set
    status = 'in_progress',
    current_question_no = excluded.current_question_no,
    started_at = now(),
    updated_at = now()
  returning * into v_attempt;

  return query
  select
    v_attempt.id,
    v_attempt.set_id,
    v_attempt.user_id,
    v_attempt.status,
    v_attempt.current_question_no,
    v_attempt.started_at,
    v_attempt.cleared_at,
    v_attempt.total_elapsed_seconds,
    v_attempt.clear_rank;
end;
$$;

drop function if exists public.submit_maze_answer(uuid, text);
create or replace function public.submit_maze_answer(p_question_id uuid, p_answer text)
returns table (
  is_correct boolean,
  current_question_no integer,
  status public.maze_attempt_status,
  cleared_at timestamptz,
  total_elapsed_seconds integer,
  clear_rank integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question public.maze_questions;
  v_answer public.maze_question_answers;
  v_attempt public.maze_attempts;
  v_last_question_no integer;
  v_is_correct boolean;
  v_clear_rank integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_question from public.maze_questions as q where q.id = p_question_id;
  if v_question.id is null then
    raise exception 'Question not found';
  end if;

  select *
  into v_attempt
  from public.maze_attempts as a
  where a.set_id = v_question.set_id
    and a.user_id = auth.uid();

  if v_attempt.id is null then
    raise exception 'Maze attempt not found';
  end if;

  if v_attempt.status = 'cleared' then
    return query
    select true, v_attempt.current_question_no, v_attempt.status, v_attempt.cleared_at, v_attempt.total_elapsed_seconds, v_attempt.clear_rank;
    return;
  end if;

  if v_question.question_no <> v_attempt.current_question_no then
    raise exception 'This question is not currently open';
  end if;

  select * into v_answer from public.maze_question_answers as ans where ans.question_id = p_question_id;
  if v_answer.question_id is null then
    raise exception 'Answer is not configured';
  end if;

  v_is_correct := lower(rtrim(coalesce(p_answer, ''))) = lower(rtrim(v_answer.answer_text));

  insert into public.maze_answer_logs (attempt_id, question_id, submitted_answer, is_correct)
  values (v_attempt.id, p_question_id, coalesce(p_answer, ''), v_is_correct);

  if v_is_correct then
    select max(q.question_no) into v_last_question_no from public.maze_questions as q where q.set_id = v_question.set_id;

    if v_question.question_no >= v_last_question_no then
      select count(*) + 1
      into v_clear_rank
      from public.maze_attempts as a
      where a.set_id = v_question.set_id
        and a.cleared_at is not null
        and a.id <> v_attempt.id;

      update public.maze_attempts
      set
        status = 'cleared',
        cleared_at = coalesce(maze_attempts.cleared_at, now()),
        total_elapsed_seconds = coalesce(
          maze_attempts.total_elapsed_seconds,
          greatest(0, floor(extract(epoch from (now() - maze_attempts.started_at)))::integer)
        ),
        clear_rank = coalesce(maze_attempts.clear_rank, v_clear_rank),
        updated_at = now()
      where maze_attempts.id = v_attempt.id
      returning * into v_attempt;
    else
      update public.maze_attempts
      set current_question_no = v_question.question_no + 1, updated_at = now()
      where maze_attempts.id = v_attempt.id
      returning * into v_attempt;
    end if;
  end if;

  return query
  select v_is_correct, v_attempt.current_question_no, v_attempt.status, v_attempt.cleared_at, v_attempt.total_elapsed_seconds, v_attempt.clear_rank;
end;
$$;

drop function if exists public.get_maze_ranking(uuid, text, integer);
create or replace function public.get_maze_ranking(
  p_set_id uuid,
  p_metric text default 'clear_order',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  nickname text,
  cleared_at timestamptz,
  total_elapsed_seconds integer,
  clear_rank integer,
  elapsed_rank integer,
  is_me boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      a.user_id,
      coalesce(nullif(trim(p.nickname), ''), '알 수 없음') as nickname,
      a.cleared_at,
      coalesce(a.total_elapsed_seconds, 0) as total_elapsed_seconds,
      coalesce(
        a.clear_rank,
        row_number() over (partition by a.set_id order by a.cleared_at asc, a.id asc)::integer
      ) as clear_rank,
      row_number() over (
        partition by a.set_id
        order by coalesce(a.total_elapsed_seconds, 2147483647) asc, a.cleared_at asc, a.id asc
      )::integer as elapsed_rank
    from public.maze_attempts a
    join public.profiles p on p.id = a.user_id
    where a.set_id = p_set_id
      and a.cleared_at is not null
  ),
  top_ranked as (
    select *
    from ranked
    order by
      case when p_metric = 'elapsed_time' then elapsed_rank else clear_rank end asc,
      clear_rank asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ),
  my_ranked as (
    select *
    from ranked
    where user_id = auth.uid()
  )
  select
    combined.user_id,
    combined.nickname,
    combined.cleared_at,
    combined.total_elapsed_seconds,
    combined.clear_rank,
    combined.elapsed_rank,
    combined.user_id = auth.uid() as is_me
  from (
    select * from my_ranked
    union
    select * from top_ranked
  ) combined
  order by
    case when combined.user_id = auth.uid() then 0 else 1 end,
    case when p_metric = 'elapsed_time' then combined.elapsed_rank else combined.clear_rank end asc,
    combined.clear_rank asc;
$$;

grant execute on function public.get_maze_ranking(uuid, text, integer) to authenticated;
grant execute on function public.restart_maze_attempt(uuid) to authenticated;
grant execute on function public.submit_maze_answer(uuid, text) to authenticated;

insert into public.lounge_contents (
  slug,
  title,
  subtitle,
  summary,
  content_type,
  access_level,
  status,
  route_path,
  tags,
  metadata
)
values (
  'maze-clear-top-10-event',
  '미궁 선착 클리어 이벤트',
  '미궁 클리어순 선착 10명',
  '이벤트 오픈 후 대상 미궁을 클리어한 선착 10명을 확인하는 단기 이벤트 콘텐츠입니다.',
  'event',
  'member',
  'published',
  '/lounge/events/maze-clear-top-10-event',
  array['미궁', '이벤트', '랭킹'],
  jsonb_build_object(
    'feature', 'event',
    'eventKind', 'maze_ranking',
    'descriptionBlocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'intro',
        'type', 'text',
        'text', '이벤트 오픈 후 대상 미궁을 클리어한 선착 10명을 확인하는 단기 이벤트 콘텐츠입니다.'
      )
    )
  )
)
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  summary = excluded.summary,
  content_type = excluded.content_type,
  access_level = excluded.access_level,
  status = excluded.status,
  route_path = excluded.route_path,
  tags = excluded.tags,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.lounge_content_nodes (
  content_id,
  is_enabled,
  display_mode,
  zone,
  map_x,
  map_y,
  node_label,
  node_variant,
  node_theme_color,
  sort_order
)
select
  id,
  true,
  'both',
  'event',
  68,
  34,
  '미궁 이벤트',
  'event',
  '#8B1E2D',
  20
from public.lounge_contents
where slug = 'maze-clear-top-10-event'
on conflict (content_id) do update
set
  is_enabled = excluded.is_enabled,
  display_mode = excluded.display_mode,
  zone = excluded.zone,
  map_x = excluded.map_x,
  map_y = excluded.map_y,
  node_label = excluded.node_label,
  node_variant = excluded.node_variant,
  node_theme_color = excluded.node_theme_color,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.lounge_event_configs (
  content_id,
  opens_at,
  target_route_path,
  ranking_source,
  ranking_metric,
  ranking_target_id,
  reward_rank_limit,
  rank_condition_type
)
select
  event_content.id,
  now() + interval '1 day',
  '/lounge/maze/first-maze',
  'maze',
  'clear_order',
  maze_set.id,
  10,
  'top'
from public.lounge_contents event_content
left join public.maze_quiz_sets maze_set on maze_set.slug = 'first-maze'
where event_content.slug = 'maze-clear-top-10-event'
on conflict (content_id) do update
set
  target_route_path = excluded.target_route_path,
  ranking_source = excluded.ranking_source,
  ranking_metric = excluded.ranking_metric,
  ranking_target_id = excluded.ranking_target_id,
  reward_rank_limit = excluded.reward_rank_limit,
  rank_condition_type = excluded.rank_condition_type,
  updated_at = now();

notify pgrst, 'reload schema';
