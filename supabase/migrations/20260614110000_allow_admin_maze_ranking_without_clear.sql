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
  with viewer_access as (
    select
      public.is_admin() as is_admin,
      exists (
        select 1
        from public.maze_attempts viewer_attempt
        where viewer_attempt.set_id = p_set_id
          and viewer_attempt.user_id = auth.uid()
          and viewer_attempt.cleared_at is not null
      ) as has_cleared
  ),
  ranked as (
    select
      a.user_id,
      coalesce(nullif(trim(p.nickname), ''), '이름없음') as nickname,
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
      and exists (
        select 1
        from viewer_access
        where is_admin or has_cleared
      )
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

notify pgrst, 'reload schema';
