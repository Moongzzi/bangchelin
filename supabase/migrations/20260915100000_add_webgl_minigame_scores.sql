create table if not exists public.minigames (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_active boolean not null default true,
  min_score integer not null default 0,
  max_score integer not null default 2147483647,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minigames_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint minigames_title_check check (length(trim(title)) between 1 and 100),
  constraint minigames_score_range_check check (min_score <= max_score)
);

create table if not exists public.minigame_score_records (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.minigames(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null,
  duration_ms integer,
  client_run_id uuid not null,
  client_version text,
  metadata jsonb not null default '{}'::jsonb,
  is_valid boolean not null default true,
  invalid_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minigame_score_records_duration_check check (duration_ms is null or duration_ms >= 0),
  constraint minigame_score_records_client_version_check check (client_version is null or length(client_version) <= 50),
  constraint minigame_score_records_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint minigame_score_records_metadata_size_check check (octet_length(metadata::text) <= 4096),
  constraint minigame_score_records_invalid_reason_check check (
    (is_valid and invalid_reason is null)
    or (not is_valid and nullif(trim(invalid_reason), '') is not null)
  ),
  unique (game_id, user_id, client_run_id)
);

comment on table public.minigames is 'Unity WebGL minigame catalog and accepted score range.';
comment on table public.minigame_score_records is 'Append-only score attempts. Ranking RPC selects one valid best score per account.';
comment on column public.minigame_score_records.client_run_id is 'Client-generated UUID used as an idempotency key for retry-safe score submission.';
comment on column public.minigame_score_records.is_valid is 'Administrative/server verification flag. Invalid records never affect best scores or rankings.';

create index if not exists minigame_score_records_user_game_created_idx
  on public.minigame_score_records (user_id, game_id, created_at desc);

create index if not exists minigame_score_records_game_ranking_idx
  on public.minigame_score_records (game_id, score desc, created_at asc)
  where is_valid;

drop trigger if exists set_minigames_updated_at on public.minigames;
create trigger set_minigames_updated_at
before update on public.minigames
for each row execute function public.set_updated_at();

drop trigger if exists set_minigame_score_records_updated_at on public.minigame_score_records;
create trigger set_minigame_score_records_updated_at
before update on public.minigame_score_records
for each row execute function public.set_updated_at();

alter table public.minigames enable row level security;
alter table public.minigame_score_records enable row level security;

create policy "Active members can read active minigames"
on public.minigames
for select
to authenticated
using (is_active and public.is_active_account(auth.uid()));

create policy "Admins manage minigames"
on public.minigames
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Members read own minigame records"
on public.minigame_score_records
for select
to authenticated
using (user_id = auth.uid() and public.is_active_account(auth.uid()));

create policy "Admins read all minigame records"
on public.minigame_score_records
for select
to authenticated
using (public.is_admin());

create policy "Admins validate minigame records"
on public.minigame_score_records
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.get_webgl_player()
returns table (
  user_id uuid,
  nickname text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'Active approved account required' using errcode = '42501';
  end if;

  return query
  select p.id, p.nickname, p.avatar_url
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

create or replace function public.submit_minigame_score(
  p_game_slug text,
  p_score integer,
  p_client_run_id uuid,
  p_duration_ms integer default null,
  p_client_version text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  submission_id uuid,
  game_id uuid,
  game_slug text,
  score integer,
  personal_best integer,
  is_personal_best boolean,
  ranking bigint,
  submitted_at timestamptz,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.minigames;
  v_record public.minigame_score_records;
  v_previous_best integer;
  v_personal_best integer;
  v_is_duplicate boolean := false;
  v_ranking bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'Active approved account required' using errcode = '42501';
  end if;

  select * into v_game
  from public.minigames g
  where g.slug = lower(trim(p_game_slug))
    and g.is_active;

  if v_game.id is null then
    raise exception 'Minigame not found or inactive' using errcode = '22023';
  end if;

  if p_score is null or p_score < v_game.min_score or p_score > v_game.max_score then
    raise exception 'Score is outside the accepted range' using errcode = '22003';
  end if;

  if p_client_run_id is null then
    raise exception 'client_run_id is required' using errcode = '22023';
  end if;

  if p_duration_ms is not null and p_duration_ms < 0 then
    raise exception 'duration_ms must be zero or greater' using errcode = '22023';
  end if;

  if p_client_version is not null and length(p_client_version) > 50 then
    raise exception 'client_version is too long' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_metadata), 'null') <> 'object'
    or octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 4096 then
    raise exception 'metadata must be a JSON object up to 4096 bytes' using errcode = '22023';
  end if;

  -- Serialize retries and simultaneous finishes for the same player/game.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || v_game.id::text, 0));

  select * into v_record
  from public.minigame_score_records r
  where r.game_id = v_game.id
    and r.user_id = auth.uid()
    and r.client_run_id = p_client_run_id;

  if v_record.id is not null then
    v_is_duplicate := true;
  else
    if (
      select count(*)
      from public.minigame_score_records r
      where r.game_id = v_game.id
        and r.user_id = auth.uid()
        and r.created_at >= now() - interval '1 minute'
    ) >= 30 then
      raise exception 'Too many score submissions' using errcode = 'P0001';
    end if;

    select max(r.score) into v_previous_best
    from public.minigame_score_records r
    where r.game_id = v_game.id
      and r.user_id = auth.uid()
      and r.is_valid;

    insert into public.minigame_score_records (
      game_id,
      user_id,
      score,
      duration_ms,
      client_run_id,
      client_version,
      metadata
    ) values (
      v_game.id,
      auth.uid(),
      p_score,
      p_duration_ms,
      p_client_run_id,
      nullif(trim(p_client_version), ''),
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_record;
  end if;

  select max(r.score) into v_personal_best
  from public.minigame_score_records r
  where r.game_id = v_game.id
    and r.user_id = auth.uid()
    and r.is_valid;

  if v_personal_best is not null then
    select count(*) + 1 into v_ranking
    from (
      select r.user_id, max(r.score) as best_score
      from public.minigame_score_records r
      where r.game_id = v_game.id and r.is_valid
      group by r.user_id
    ) best_by_user
    where best_by_user.best_score > v_personal_best;
  end if;

  return query select
    v_record.id,
    v_game.id,
    v_game.slug,
    v_record.score,
    v_personal_best,
    (not v_is_duplicate and (v_previous_best is null or v_record.score > v_previous_best)),
    v_ranking,
    v_record.created_at,
    v_is_duplicate;
end;
$$;

create or replace function public.get_my_minigame_best(p_game_slug text)
returns table (
  game_id uuid,
  game_slug text,
  personal_best integer,
  ranking bigint,
  play_count bigint,
  best_achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'Active approved account required' using errcode = '42501';
  end if;

  return query
  with selected_game as (
    select g.id, g.slug
    from public.minigames g
    where g.slug = lower(trim(p_game_slug)) and g.is_active
  ),
  best_per_user as (
    select r.user_id, max(r.score) as best_score
    from public.minigame_score_records r
    join selected_game g on g.id = r.game_id
    where r.is_valid
    group by r.user_id
  ),
  mine as (
    select
      max(r.score) filter (where r.is_valid) as best_score,
      count(*) as attempts,
      min(r.created_at) filter (
        where r.is_valid
          and r.score = (select b.best_score from best_per_user b where b.user_id = auth.uid())
      ) as achieved_at
    from public.minigame_score_records r
    join selected_game g on g.id = r.game_id
    where r.user_id = auth.uid()
  )
  select
    g.id,
    g.slug,
    m.best_score,
    case when m.best_score is null then null
      else (select count(*) + 1 from best_per_user b where b.best_score > m.best_score)
    end,
    m.attempts,
    m.achieved_at
  from selected_game g
  cross join mine m;
end;
$$;

create or replace function public.get_minigame_ranking(
  p_game_slug text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  ranking bigint,
  user_id uuid,
  nickname text,
  score integer,
  best_achieved_at timestamptz,
  is_me boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_active_account(auth.uid()) then
    raise exception 'Active approved account required' using errcode = '42501';
  end if;

  return query
  with selected_game as (
    select g.id
    from public.minigames g
    where g.slug = lower(trim(p_game_slug)) and g.is_active
  ),
  one_best_per_user as (
    select distinct on (r.user_id)
      r.user_id,
      r.score,
      r.created_at
    from public.minigame_score_records r
    join selected_game g on g.id = r.game_id
    where r.is_valid
    order by r.user_id, r.score desc, r.created_at asc, r.id asc
  ),
  ranked as (
    select
      dense_rank() over (order by b.score desc) as position,
      b.user_id,
      coalesce(nullif(trim(p.nickname), ''), '이름 없음') as nickname,
      b.score,
      b.created_at,
      b.user_id = auth.uid() as is_me
    from one_best_per_user b
    join public.profiles p on p.id = b.user_id
    where p.approval_status = 'approved'
      and p.account_status = 'active'
  )
  select r.position, r.user_id, r.nickname, r.score, r.created_at, r.is_me
  from ranked r
  order by r.position asc, r.created_at asc, r.user_id asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on table public.minigames from anon, authenticated;
revoke all on table public.minigame_score_records from anon, authenticated;
grant select, insert, update, delete on table public.minigames to authenticated;
grant select on table public.minigame_score_records to authenticated;
grant update (is_valid, invalid_reason) on table public.minigame_score_records to authenticated;

revoke all on function public.get_webgl_player() from public, anon;
revoke all on function public.submit_minigame_score(text, integer, uuid, integer, text, jsonb) from public, anon;
revoke all on function public.get_my_minigame_best(text) from public, anon;
revoke all on function public.get_minigame_ranking(text, integer, integer) from public, anon;

grant execute on function public.get_webgl_player() to authenticated;
grant execute on function public.submit_minigame_score(text, integer, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.get_my_minigame_best(text) to authenticated;
grant execute on function public.get_minigame_ranking(text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
