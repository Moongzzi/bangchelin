create index if not exists user_activity_logs_user_id_created_at_desc_idx
  on public.user_activity_logs (user_id, created_at desc)
  where user_id is not null;

create or replace function public.get_admin_user_summaries(
  p_online_window_minutes integer default 5
)
returns table (
  id uuid,
  username text,
  nickname text,
  email text,
  role text,
  approval_status public.signup_request_status,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  is_online boolean,
  activity_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.nickname,
    p.email,
    p.role::text,
    p.approval_status,
    p.created_at,
    p.updated_at,
    p.last_seen_at,
    u.last_sign_in_at,
    latest_activity.created_at as last_activity_at,
    greatest(
      coalesce(p.last_seen_at, '-infinity'::timestamptz),
      coalesce(u.last_sign_in_at, '-infinity'::timestamptz),
      coalesce(latest_activity.created_at, '-infinity'::timestamptz)
    ) >= now() - make_interval(mins => greatest(1, least(coalesce(p_online_window_minutes, 5), 60))) as is_online,
    coalesce(activity_counter.activity_count, 0)::bigint as activity_count
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select l.created_at
    from public.user_activity_logs l
    where l.user_id = p.id
    order by l.created_at desc
    limit 1
  ) latest_activity on true
  left join lateral (
    select count(*)::bigint as activity_count
    from (
      select 1
      from public.user_activity_logs l
      where l.user_id = p.id
      limit 10000
    ) bounded_logs
  ) activity_counter on true
  where public.is_admin()
  order by p.created_at desc;
$$;

grant execute on function public.get_admin_user_summaries(integer) to authenticated;

notify pgrst, 'reload schema';
