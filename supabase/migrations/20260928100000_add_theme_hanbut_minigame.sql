alter table public.minigames
  drop constraint if exists minigames_slug_check;

alter table public.minigames
  add constraint minigames_slug_check
  check (slug ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$');

insert into public.minigames (
  slug,
  title,
  description,
  is_active,
  min_score,
  max_score
)
values (
  'theme_hanbut',
  '테마한붓',
  '테마한붓 Unity WebGL 미니게임',
  true,
  0,
  2147483647
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active,
  min_score = excluded.min_score,
  max_score = excluded.max_score,
  updated_at = now();

notify pgrst, 'reload schema';
