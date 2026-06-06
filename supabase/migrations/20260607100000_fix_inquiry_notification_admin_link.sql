create or replace function public.fix_inquiry_notification_admin_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_target_column text;
  detail_link text := '/admin/inquiries/' || new.id::text;
begin
  if to_regclass('public.notifications') is null then
    return new;
  end if;

  select column_name
    into notification_target_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name in ('recipient_id', 'user_id')
  order by case column_name when 'recipient_id' then 1 else 2 end
  limit 1;

  if notification_target_column is null then
    return new;
  end if;

  execute format(
    'update public.notifications n
        set link_path = $1
      where n.type::text = %L
        and coalesce(n.link_path, '''') in (%L, %L)
        and n.created_at >= now() - interval ''10 seconds''
        and exists (
          select 1
          from public.profiles p
          where p.id = n.%I
            and p.role = %L
        )',
    'inquiry_submitted',
    '/report',
    'report',
    notification_target_column,
    'admin'
  )
  using detail_link;

  return new;
end;
$$;

drop trigger if exists zzz_fix_inquiry_notification_admin_link on public.inquiries;
create trigger zzz_fix_inquiry_notification_admin_link
after insert on public.inquiries
for each row
execute function public.fix_inquiry_notification_admin_link();
