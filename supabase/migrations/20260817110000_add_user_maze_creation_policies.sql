create index if not exists maze_quiz_sets_created_by_updated_idx
  on public.maze_quiz_sets (created_by, updated_at desc);

alter table public.maze_questions
  add column if not exists title text;

alter table public.maze_questions
  add column if not exists is_start boolean not null default false;

create unique index if not exists maze_questions_one_start_per_set_idx
  on public.maze_questions (set_id)
  where is_start;

create table if not exists public.maze_question_answer_routes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.maze_questions(id) on delete cascade,
  answer_text text not null,
  target_question_id uuid references public.maze_questions(id) on delete set null,
  is_ending boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maze_question_answer_routes_target_check check (is_ending = true or target_question_id is not null)
);

create index if not exists maze_question_answer_routes_question_order_idx
  on public.maze_question_answer_routes (question_id, sort_order);

alter table public.maze_question_answer_routes enable row level security;

drop policy if exists "Users can read own maze sets" on public.maze_quiz_sets;
create policy "Users can read own maze sets"
on public.maze_quiz_sets
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "Users can create own maze sets" on public.maze_quiz_sets;
create policy "Users can create own maze sets"
on public.maze_quiz_sets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
);

drop policy if exists "Users can update own draft maze sets" on public.maze_quiz_sets;
drop policy if exists "Users can update own maze sets" on public.maze_quiz_sets;
create policy "Users can update own maze sets"
on public.maze_quiz_sets
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Users can read own maze questions" on public.maze_questions;
create policy "Users can read own maze questions"
on public.maze_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.maze_quiz_sets s
    where s.id = public.maze_questions.set_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can manage own draft maze questions" on public.maze_questions;
drop policy if exists "Users can manage own maze questions" on public.maze_questions;
create policy "Users can manage own maze questions"
on public.maze_questions
for all
to authenticated
using (
  exists (
    select 1
    from public.maze_quiz_sets s
    where s.id = public.maze_questions.set_id
      and s.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.maze_quiz_sets s
    where s.id = public.maze_questions.set_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can read own maze question answers" on public.maze_question_answers;
create policy "Users can read own maze question answers"
on public.maze_question_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answers.question_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can manage own draft maze question answers" on public.maze_question_answers;
drop policy if exists "Users can manage own maze question answers" on public.maze_question_answers;
create policy "Users can manage own maze question answers"
on public.maze_question_answers
for all
to authenticated
using (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answers.question_id
      and s.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answers.question_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can read own maze answer routes" on public.maze_question_answer_routes;
create policy "Users can read own maze answer routes"
on public.maze_question_answer_routes
for select
to authenticated
using (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answer_routes.question_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can manage own draft maze answer routes" on public.maze_question_answer_routes;
drop policy if exists "Users can manage own maze answer routes" on public.maze_question_answer_routes;
create policy "Users can manage own maze answer routes"
on public.maze_question_answer_routes
for all
to authenticated
using (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answer_routes.question_id
      and s.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.maze_questions q
    join public.maze_quiz_sets s on s.id = q.set_id
    where q.id = public.maze_question_answer_routes.question_id
      and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can upload own custom maze assets" on storage.objects;
create policy "Users can upload own custom maze assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lounge-assets'
  and name like ('maze-custom/' || auth.uid()::text || '/%')
);

drop policy if exists "Users can update own custom maze assets" on storage.objects;
create policy "Users can update own custom maze assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lounge-assets'
  and name like ('maze-custom/' || auth.uid()::text || '/%')
)
with check (
  bucket_id = 'lounge-assets'
  and name like ('maze-custom/' || auth.uid()::text || '/%')
);

notify pgrst, 'reload schema';
