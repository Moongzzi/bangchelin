create type public.lounge_content_type as enum ('game', 'quiz', 'event', 'tool');
create type public.lounge_access_level as enum ('public', 'member', 'admin', 'hidden');
create type public.lounge_content_status as enum ('draft', 'published', 'archived');
create type public.lounge_display_mode as enum ('map', 'store', 'both');

create table public.lounge_contents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  summary text,
  content_type public.lounge_content_type not null,
  access_level public.lounge_access_level not null default 'public',
  status public.lounge_content_status not null default 'draft',
  route_path text not null,
  thumbnail_url text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lounge_content_nodes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null unique references public.lounge_contents(id) on delete cascade,
  is_enabled boolean not null default false,
  display_mode public.lounge_display_mode not null default 'both',
  zone text,
  map_x numeric(6,2) not null default 50,
  map_y numeric(6,2) not null default 50,
  node_label text,
  node_icon_url text,
  node_variant text not null default 'default',
  node_theme_color text,
  sort_order integer not null default 0,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lounge_activity_logs (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.lounge_contents(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.lounge_rankings (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.lounge_contents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, user_id)
);

create table public.lounge_settings (
  id text primary key,
  map_background_url text,
  map_background_mode text not null default 'css' check (map_background_mode in ('css', 'image')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lounge_contents enable row level security;
alter table public.lounge_content_nodes enable row level security;
alter table public.lounge_activity_logs enable row level security;
alter table public.lounge_rankings enable row level security;
alter table public.lounge_settings enable row level security;

create policy "Public can read published lounge contents"
on public.lounge_contents for select
to anon, authenticated
using (
  status = 'published'
  and access_level in ('public', 'member')
);

create policy "Public can read enabled lounge nodes"
on public.lounge_content_nodes for select
to anon, authenticated
using (
  is_enabled = true
  and exists (
    select 1
    from public.lounge_contents c
    where c.id = content_id
      and c.status = 'published'
      and c.access_level in ('public', 'member')
  )
);

create policy "Admins manage lounge contents"
on public.lounge_contents for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins manage lounge nodes"
on public.lounge_content_nodes for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can insert lounge activity logs"
on public.lounge_activity_logs for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

create policy "Users can read own lounge rankings"
on public.lounge_rankings for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own lounge rankings"
on public.lounge_rankings for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own lounge rankings"
on public.lounge_rankings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Public can read lounge settings"
on public.lounge_settings for select
to anon, authenticated
using (id = 'main');

create policy "Admins manage lounge settings"
on public.lounge_settings for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

insert into public.lounge_settings (id, map_background_url, map_background_mode)
values ('main', null, 'css')
on conflict (id) do nothing;

insert into public.lounge_contents
  (slug, title, subtitle, summary, content_type, access_level, status, route_path, tags)
values
  ('daily-quiz', '데일리 퀴즈', '매일 열리는 짧은 문제', '가볍게 풀고 랭킹을 쌓는 첫 퀴즈 콘텐츠입니다.', 'quiz', 'public', 'published', '/lounge/daily-quiz', array['퀴즈', '랭킹', '준비 중']),
  ('random-game', '랜덤 미니게임', '짧게 즐기는 실험실', '라운지에 어울리는 미니게임을 차례대로 추가할 예정입니다.', 'game', 'member', 'published', '/lounge/random-game', array['게임', '로그인 필요', '준비 중']),
  ('ranking-hub', '랭킹 허브', '점수와 기록을 모으는 장소', '콘텐츠별 랭킹과 시즌 기록을 확인하는 영역입니다.', 'event', 'public', 'published', '/lounge/ranking', array['랭킹', '기록', '준비 중']),
  ('event-dock', '시즌 이벤트', '기간 한정 콘텐츠 구역', '추후 시즌 이벤트와 특별 미션을 연결할 공간입니다.', 'event', 'public', 'published', '/lounge/event-dock', array['이벤트', '시즌', '준비 중'])
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  summary = excluded.summary,
  content_type = excluded.content_type,
  access_level = excluded.access_level,
  status = excluded.status,
  route_path = excluded.route_path,
  tags = excluded.tags,
  updated_at = now();

insert into public.lounge_content_nodes
  (content_id, is_enabled, display_mode, zone, map_x, map_y, node_label, node_variant, node_theme_color, sort_order)
select id, false, 'both', 'quiz-plaza', 27, 33, '퀴즈 광장', 'quiz', '#8B1E2D', 10
from public.lounge_contents
where slug = 'daily-quiz'
on conflict (content_id) do nothing;

insert into public.lounge_content_nodes
  (content_id, is_enabled, display_mode, zone, map_x, map_y, node_label, node_variant, node_theme_color, sort_order)
select id, false, 'both', 'arcade-hill', 66, 27, '아케이드 언덕', 'game', '#223041', 20
from public.lounge_contents
where slug = 'random-game'
on conflict (content_id) do nothing;

insert into public.lounge_content_nodes
  (content_id, is_enabled, display_mode, zone, map_x, map_y, node_label, node_variant, node_theme_color, sort_order)
select id, false, 'both', 'ranking-tower', 50, 62, '랭킹 타워', 'ranking', '#A78643', 30
from public.lounge_contents
where slug = 'ranking-hub'
on conflict (content_id) do nothing;

insert into public.lounge_content_nodes
  (content_id, is_enabled, display_mode, zone, map_x, map_y, node_label, node_variant, node_theme_color, sort_order)
select id, false, 'both', 'event-dock', 76, 70, '이벤트 선착장', 'event', '#31493C', 40
from public.lounge_contents
where slug = 'event-dock'
on conflict (content_id) do nothing;

insert into storage.buckets (id, name, public)
values ('lounge-assets', 'lounge-assets', true)
on conflict (id) do update set public = excluded.public;

create policy "Public can read lounge assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'lounge-assets');

create policy "Admins can upload lounge assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lounge-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "Admins can update lounge assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lounge-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  bucket_id = 'lounge-assets'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

notify pgrst, 'reload schema';
