do $$
begin
  if to_regtype('public.activity_region') is not null then
    alter type public.activity_region add value if not exists 'gyeonggi_incheon';
    alter type public.activity_region add value if not exists 'chungcheong';
    alter type public.activity_region add value if not exists 'gyeongsang';
    alter type public.activity_region add value if not exists 'jeolla';
    alter type public.activity_region add value if not exists 'gangwon';
    alter type public.activity_region add value if not exists 'jeju';
  end if;
end $$;
