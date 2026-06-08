alter table public.calendar_event_comments
  add column if not exists author_nickname text;

alter table public.calendar_event_comments
  add column if not exists author_avatar_url text;

comment on column public.calendar_event_comments.author_nickname
  is 'Nickname snapshot used to render calendar comments even when profile embedding is unavailable.';

comment on column public.calendar_event_comments.author_avatar_url
  is 'Profile avatar URL snapshot used to render calendar comments.';

create or replace function public.resolve_calendar_comment_author_nickname(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_nickname text;
  metadata jsonb;
  auth_email text;
begin
  select nullif(trim(p.nickname), '')
    into profile_nickname
  from public.profiles p
  where p.id = p_user_id;

  if profile_nickname is not null then
    return profile_nickname;
  end if;

  select coalesce(u.raw_user_meta_data, '{}'::jsonb), u.email
    into metadata, auth_email
  from auth.users u
  where u.id = p_user_id;

  return coalesce(
    nullif(trim(metadata->>'nickname'), ''),
    nullif(trim(metadata->>'username'), ''),
    nullif(trim(split_part(coalesce(auth_email, ''), '@', 1)), ''),
    '알 수 없는 사용자'
  );
end;
$$;

create or replace function public.resolve_calendar_comment_author_avatar_url(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select nullif(trim(p.avatar_url), '')
  from public.profiles p
  where p.id = p_user_id
  limit 1;
$$;

create or replace function public.set_calendar_event_comment_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id = auth.uid();
  new.author_nickname = public.resolve_calendar_comment_author_nickname(new.user_id);
  new.author_avatar_url = public.resolve_calendar_comment_author_avatar_url(new.user_id);
  return new;
end;
$$;

update public.calendar_event_comments c
set author_nickname = public.resolve_calendar_comment_author_nickname(c.user_id)
where c.author_nickname is null
   or length(trim(c.author_nickname)) = 0;

update public.calendar_event_comments c
set author_avatar_url = public.resolve_calendar_comment_author_avatar_url(c.user_id)
where c.author_avatar_url is null
   or length(trim(c.author_avatar_url)) = 0;

notify pgrst, 'reload schema';
