do $$
begin
  create type public.admin_kakao_share_category as enum ('notice', 'update');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.admin_kakao_share_messages (
  id uuid primary key default gen_random_uuid(),
  category public.admin_kakao_share_category not null,
  template_id bigint not null,
  profile_name text not null,
  title text,
  content text,
  items text[] not null default '{}',
  image_url text,
  image_urls text[] not null default '{}',
  target_url text,
  button_url_1 text,
  button_url_2 text,
  button_text_1 text,
  button_text_2 text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kakao_share_message_content_check check (
    nullif(trim(coalesce(title, '')), '') is not null
    and nullif(trim(coalesce(content, '')), '') is not null
  ),
  constraint admin_kakao_share_update_button_urls_check check (
    category <> 'update'
    or nullif(trim(coalesce(button_url_2, '')), '') is null
    or nullif(trim(coalesce(button_url_1, '')), '') is not null
  ),
  constraint admin_kakao_share_update_button_texts_check check (
    category <> 'update'
    or (
      (
        nullif(trim(coalesce(button_url_1, '')), '') is null
        or nullif(trim(coalesce(button_text_1, '')), '') is not null
      )
      and (
        nullif(trim(coalesce(button_url_2, '')), '') is null
        or nullif(trim(coalesce(button_text_2, '')), '') is not null
      )
    )
  ),
  constraint admin_kakao_share_update_no_images_check check (
    category <> 'update'
    or (
      image_url is null
      and cardinality(image_urls) = 0
    )
  )
);

alter table public.admin_kakao_share_messages
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists button_url_1 text,
  add column if not exists button_url_2 text,
  add column if not exists button_text_1 text,
  add column if not exists button_text_2 text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_kakao_share_messages'
      and column_name = 'update_items'
  ) then
    execute $backfill$
      update public.admin_kakao_share_messages
      set
        title = coalesce(nullif(trim(title), ''), nullif(trim(update_items->0->>'title'), '')),
        content = coalesce(nullif(trim(content), ''), nullif(trim(update_items->0->>'content'), ''))
      where category = 'update'
        and update_items is not null
        and jsonb_typeof(update_items) = 'array'
        and jsonb_array_length(update_items) > 0
    $backfill$;
  end if;
end;
$$;

update public.admin_kakao_share_messages
set
  button_url_1 = coalesce(nullif(trim(button_url_1), ''), nullif(trim(target_url), '')),
  button_url_2 = coalesce(nullif(trim(button_url_2), ''), nullif(trim(target_url), ''))
where category = 'update'
  and nullif(trim(coalesce(target_url, '')), '') is not null;

alter table public.admin_kakao_share_messages
  drop constraint if exists admin_kakao_share_notice_content_check,
  drop constraint if exists admin_kakao_share_message_content_check,
  drop constraint if exists admin_kakao_share_update_items_check,
  drop constraint if exists admin_kakao_share_update_target_check,
  drop constraint if exists admin_kakao_share_update_item_shape_check,
  drop constraint if exists admin_kakao_share_update_button_urls_check,
  drop constraint if exists admin_kakao_share_update_button_texts_check,
  drop constraint if exists admin_kakao_share_update_no_images_check;

alter table public.admin_kakao_share_messages
  add constraint admin_kakao_share_message_content_check check (
    nullif(trim(coalesce(title, '')), '') is not null
    and nullif(trim(coalesce(content, '')), '') is not null
  ) not valid,
  add constraint admin_kakao_share_update_button_urls_check check (
    category <> 'update'
    or nullif(trim(coalesce(button_url_2, '')), '') is null
    or nullif(trim(coalesce(button_url_1, '')), '') is not null
  ) not valid,
  add constraint admin_kakao_share_update_button_texts_check check (
    category <> 'update'
    or (
      (
        nullif(trim(coalesce(button_url_1, '')), '') is null
        or nullif(trim(coalesce(button_text_1, '')), '') is not null
      )
      and (
        nullif(trim(coalesce(button_url_2, '')), '') is null
        or nullif(trim(coalesce(button_text_2, '')), '') is not null
      )
    )
  ) not valid,
  add constraint admin_kakao_share_update_no_images_check check (
    category <> 'update'
    or (
      image_url is null
      and cardinality(image_urls) = 0
    )
  ) not valid;

alter table public.admin_kakao_share_messages
  drop column if exists update_items;

drop function if exists public.admin_kakao_share_update_items_are_valid(jsonb);

comment on table public.admin_kakao_share_messages is 'Admin-authored Kakao custom-template share message history.';
comment on column public.admin_kakao_share_messages.profile_name is 'Display profile name sent to Kakao template, e.g. notice/update label.';
comment on column public.admin_kakao_share_messages.items is 'Legacy flat update item list kept for REST compatibility.';
comment on column public.admin_kakao_share_messages.image_urls is 'Ordered uploaded notice image URLs used as Kakao template image1 to image3 arguments.';
comment on column public.admin_kakao_share_messages.button_url_1 is 'First update-template button URL.';
comment on column public.admin_kakao_share_messages.button_url_2 is 'Second update-template button URL.';
comment on column public.admin_kakao_share_messages.button_text_1 is 'First update-template button display text.';
comment on column public.admin_kakao_share_messages.button_text_2 is 'Second update-template button display text.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_admin_kakao_share_message_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_admin_kakao_share_messages_updated_at on public.admin_kakao_share_messages;
create trigger set_admin_kakao_share_messages_updated_at
before update on public.admin_kakao_share_messages
for each row
execute function public.set_updated_at();

drop trigger if exists set_admin_kakao_share_message_actor on public.admin_kakao_share_messages;
create trigger set_admin_kakao_share_message_actor
before insert or update on public.admin_kakao_share_messages
for each row
execute function public.set_admin_kakao_share_message_actor();

alter table public.admin_kakao_share_messages enable row level security;

drop policy if exists "Admins can read kakao share messages" on public.admin_kakao_share_messages;
create policy "Admins can read kakao share messages"
on public.admin_kakao_share_messages
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert kakao share messages" on public.admin_kakao_share_messages;
create policy "Admins can insert kakao share messages"
on public.admin_kakao_share_messages
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update kakao share messages" on public.admin_kakao_share_messages;
create policy "Admins can update kakao share messages"
on public.admin_kakao_share_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete kakao share messages" on public.admin_kakao_share_messages;
create policy "Admins can delete kakao share messages"
on public.admin_kakao_share_messages
for delete
to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.admin_kakao_share_messages to authenticated;

insert into storage.buckets (id, name, public)
values ('admin-kakao-share-assets', 'admin-kakao-share-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can read admin kakao share assets" on storage.objects;
create policy "Public can read admin kakao share assets"
on storage.objects
for select
to public
using (bucket_id = 'admin-kakao-share-assets');

drop policy if exists "Admins can manage admin kakao share assets" on storage.objects;
create policy "Admins can manage admin kakao share assets"
on storage.objects
for all
to authenticated
using (bucket_id = 'admin-kakao-share-assets' and public.is_admin())
with check (bucket_id = 'admin-kakao-share-assets' and public.is_admin());

notify pgrst, 'reload schema';
