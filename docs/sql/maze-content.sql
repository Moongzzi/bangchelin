-- Bangchelin Lounge: Maze content
-- Run this whole file in the Supabase SQL Editor.

do $$
begin
  create type public.maze_quiz_set_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.maze_attempt_status as enum ('in_progress', 'cleared');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.maze_quiz_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  cover_image_url text,
  has_start_page boolean not null default false,
  start_image_url text,
  has_end_page boolean not null default false,
  end_image_url text,
  difficulty_label text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  status public.maze_quiz_set_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maze_quiz_sets add column if not exists has_start_page boolean not null default false;
alter table public.maze_quiz_sets add column if not exists start_image_url text;
alter table public.maze_quiz_sets add column if not exists has_end_page boolean not null default false;
alter table public.maze_quiz_sets add column if not exists end_image_url text;

create table if not exists public.maze_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.maze_quiz_sets(id) on delete cascade,
  question_no integer not null check (question_no > 0),
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, question_no)
);

create table if not exists public.maze_question_answers (
  question_id uuid primary key references public.maze_questions(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maze_start_answers (
  set_id uuid primary key references public.maze_quiz_sets(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maze_attempts (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.maze_quiz_sets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.maze_attempt_status not null default 'in_progress',
  current_question_no integer not null default 1,
  started_at timestamptz not null default now(),
  cleared_at timestamptz,
  total_elapsed_seconds integer check (total_elapsed_seconds is null or total_elapsed_seconds >= 0),
  clear_rank integer check (clear_rank is null or clear_rank > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, user_id)
);

alter table public.maze_attempts add column if not exists clear_rank integer;
alter table public.maze_attempts drop constraint if exists maze_attempts_current_question_no_check;
alter table public.maze_attempts add constraint maze_attempts_current_question_no_check check (current_question_no >= 0);
alter table public.maze_attempts drop constraint if exists maze_attempts_clear_rank_check;
alter table public.maze_attempts add constraint maze_attempts_clear_rank_check check (clear_rank is null or clear_rank > 0);

create table if not exists public.maze_answer_logs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.maze_attempts(id) on delete cascade,
  question_id uuid references public.maze_questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

alter table public.maze_answer_logs alter column question_id drop not null;

create index if not exists maze_questions_set_order_idx on public.maze_questions (set_id, question_no);
create index if not exists maze_attempts_user_set_idx on public.maze_attempts (user_id, set_id);
create index if not exists maze_answer_logs_attempt_idx on public.maze_answer_logs (attempt_id, created_at desc);

alter table public.maze_quiz_sets enable row level security;
alter table public.maze_questions enable row level security;
alter table public.maze_question_answers enable row level security;
alter table public.maze_start_answers enable row level security;
alter table public.maze_attempts enable row level security;
alter table public.maze_answer_logs enable row level security;

drop policy if exists "Members can read published maze sets" on public.maze_quiz_sets;
create policy "Members can read published maze sets"
on public.maze_quiz_sets for select
to authenticated
using (status = 'published');

drop policy if exists "Members can read published maze questions" on public.maze_questions;
create policy "Members can read published maze questions"
on public.maze_questions for select
to authenticated
using (
  exists (
    select 1
    from public.maze_quiz_sets s
    where s.id = public.maze_questions.set_id
      and s.status = 'published'
  )
);

drop policy if exists "Users can read own maze attempts" on public.maze_attempts;
create policy "Users can read own maze attempts"
on public.maze_attempts for select
to authenticated
using (public.maze_attempts.user_id = auth.uid());

drop policy if exists "Users can insert own maze attempts" on public.maze_attempts;
create policy "Users can insert own maze attempts"
on public.maze_attempts for insert
to authenticated
with check (public.maze_attempts.user_id = auth.uid());

drop policy if exists "Users can update own maze attempts" on public.maze_attempts;
create policy "Users can update own maze attempts"
on public.maze_attempts for update
to authenticated
using (public.maze_attempts.user_id = auth.uid())
with check (public.maze_attempts.user_id = auth.uid());

drop policy if exists "Users can read own maze answer logs" on public.maze_answer_logs;
create policy "Users can read own maze answer logs"
on public.maze_answer_logs for select
to authenticated
using (
  exists (
    select 1
    from public.maze_attempts a
    where a.id = public.maze_answer_logs.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own maze answer logs" on public.maze_answer_logs;
create policy "Users can insert own maze answer logs"
on public.maze_answer_logs for insert
to authenticated
with check (
  exists (
    select 1
    from public.maze_attempts a
    where a.id = public.maze_answer_logs.attempt_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Admins manage maze sets" on public.maze_quiz_sets;
create policy "Admins manage maze sets"
on public.maze_quiz_sets for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins manage maze questions" on public.maze_questions;
create policy "Admins manage maze questions"
on public.maze_questions for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins manage maze answers" on public.maze_question_answers;
create policy "Admins manage maze answers"
on public.maze_question_answers for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins manage maze start answers" on public.maze_start_answers;
create policy "Admins manage maze start answers"
on public.maze_start_answers for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins read maze attempts" on public.maze_attempts;
create policy "Admins read maze attempts"
on public.maze_attempts for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins read maze answer logs" on public.maze_answer_logs;
create policy "Admins read maze answer logs"
on public.maze_answer_logs for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop function if exists public.start_maze_attempt(uuid);
drop function if exists public.restart_maze_attempt(uuid);
drop function if exists public.submit_maze_start_answer(uuid, text);
drop function if exists public.submit_maze_answer(uuid, text);

create or replace function public.start_maze_attempt(p_set_id uuid)
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

  insert into public.maze_attempts (set_id, user_id, current_question_no)
  values (p_set_id, auth.uid(), v_start_question_no)
  on conflict on constraint maze_attempts_set_id_user_id_key do update
  set updated_at = now()
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

create or replace function public.submit_maze_start_answer(p_set_id uuid, p_answer text)
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
  v_attempt public.maze_attempts;
  v_answer public.maze_start_answers;
  v_is_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_attempt
  from public.maze_attempts as a
  where a.set_id = p_set_id
    and a.user_id = auth.uid();

  if v_attempt.id is null then
    raise exception 'Maze attempt not found';
  end if;

  if v_attempt.current_question_no <> 0 then
    raise exception 'Start page is not currently open';
  end if;

  select *
  into v_answer
  from public.maze_start_answers as ans
  where ans.set_id = p_set_id;

  if v_answer.set_id is null then
    raise exception 'Start answer is not configured';
  end if;

  v_is_correct := lower(rtrim(coalesce(p_answer, ''))) = lower(rtrim(v_answer.answer_text));

  insert into public.maze_answer_logs (attempt_id, question_id, submitted_answer, is_correct)
  values (v_attempt.id, null, coalesce(p_answer, ''), v_is_correct);

  if v_is_correct then
    update public.maze_attempts
    set current_question_no = 1, updated_at = now()
    where maze_attempts.id = v_attempt.id
    returning * into v_attempt;
  end if;

  return query
  select v_is_correct, v_attempt.current_question_no, v_attempt.status, v_attempt.cleared_at, v_attempt.total_elapsed_seconds, v_attempt.clear_rank;
end;
$$;

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

  if v_question.question_no <> v_attempt.current_question_no and v_attempt.cleared_at is null then
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
      set
        current_question_no = case
          when maze_attempts.cleared_at is not null
            then greatest(maze_attempts.current_question_no, v_question.question_no + 1)
          else v_question.question_no + 1
        end,
        updated_at = now()
      where maze_attempts.id = v_attempt.id
      returning * into v_attempt;
    end if;
  end if;

  return query
  select v_is_correct, v_attempt.current_question_no, v_attempt.status, v_attempt.cleared_at, v_attempt.total_elapsed_seconds, v_attempt.clear_rank;
end;
$$;

grant execute on function public.start_maze_attempt(uuid) to authenticated;
grant execute on function public.restart_maze_attempt(uuid) to authenticated;
grant execute on function public.submit_maze_start_answer(uuid, text) to authenticated;
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
  'maze',
  '미궁',
  '순차형 이미지 퀴즈',
  '문제를 순서대로 풀어 마지막 문제까지 도달하는 라운지 콘텐츠입니다.',
  'quiz',
  'member',
  'published',
  '/lounge/maze',
  array['미궁', '퀴즈'],
  '{"feature":"maze"}'::jsonb
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
  'puzzle',
  52,
  42,
  '미궁',
  'quiz',
  '#31493C',
  10
from public.lounge_contents
where slug = 'maze'
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

insert into public.maze_quiz_sets (
  slug,
  title,
  summary,
  description,
  cover_image_url,
  difficulty_label,
  estimated_minutes,
  status,
  sort_order
)
values (
  'first-maze',
  '첫 번째 미궁',
  '방첼린 라운지의 첫 미궁입니다.',
  '1번 문제부터 차례대로 풀어 마지막 문제까지 도달하세요.',
  null,
  '입문',
  10,
  'draft',
  10
)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
