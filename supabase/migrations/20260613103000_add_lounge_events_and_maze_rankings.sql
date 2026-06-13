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
  where status = 'cleared';

create index if not exists maze_attempts_set_elapsed_idx
  on public.maze_attempts (set_id, total_elapsed_seconds asc, cleared_at asc)
  where status = 'cleared';

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
      and a.status = 'cleared'
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
