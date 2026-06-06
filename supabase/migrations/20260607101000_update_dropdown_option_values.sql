alter type public.calendar_event_category add value if not exists 'murder_mystery';
alter type public.calendar_event_category add value if not exists 'game';

alter type public.calendar_location_region add value if not exists 'gyeonggi_incheon';
alter type public.calendar_location_region add value if not exists 'chungcheong';
alter type public.calendar_location_region add value if not exists 'gyeongsang';
alter type public.calendar_location_region add value if not exists 'jeolla';
alter type public.calendar_location_region add value if not exists 'gangwon';
alter type public.calendar_location_region add value if not exists 'jeju';

alter type public.inquiry_category add value if not exists 'service';
alter type public.inquiry_category add value if not exists 'incident';
alter type public.inquiry_category add value if not exists 'suggestion';

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
