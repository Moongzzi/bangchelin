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
  'bangchelin-ddeok',
  '보름달 합치기',
  'Unity WebGL 미니게임',
  '추석 간식을 합쳐 더 높은 점수를 만드는 방슐랭 미니게임입니다.',
  'game',
  'member',
  'published',
  '/lounge/ddeok',
  array['미니게임', '보름달', 'WebGL'],
  '{"feature":"unity_webgl","gameSlug":"bangchelin-ddeok"}'::jsonb
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
  'game',
  32,
  58,
  '보름달 합치기',
  'game',
  '#8B1E2D',
  15
from public.lounge_contents
where slug = 'bangchelin-ddeok'
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

notify pgrst, 'reload schema';
