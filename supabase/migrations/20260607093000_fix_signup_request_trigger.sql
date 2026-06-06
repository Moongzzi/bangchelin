create or replace function public.handle_new_signup_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_username text := nullif(trim(coalesce(metadata->>'username', split_part(new.email, '@', 1))), '');
  requested_nickname text := nullif(trim(coalesce(metadata->>'nickname', requested_username)), '');
  requested_auth_email text := nullif(trim(coalesce(metadata->>'auth_email', new.email)), '');
begin
  insert into public.signup_requests (
    user_id,
    username,
    auth_email,
    nickname,
    birth_date,
    introduction,
    activity_region,
    email,
    status
  )
  values (
    new.id,
    requested_username,
    requested_auth_email,
    requested_nickname,
    nullif(metadata->>'birth_date', '')::date,
    nullif(metadata->>'introduction', ''),
    nullif(metadata->>'activity_region', ''),
    nullif(metadata->>'email', ''),
    'pending'
  )
  on conflict (user_id) do nothing;

  update public.profiles
    set approval_status = 'pending',
        updated_at = now()
  where id = new.id;

  return new;
end;
$$;
