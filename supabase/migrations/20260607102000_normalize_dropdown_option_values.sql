update public.calendar_events
set location_region = 'gyeonggi_incheon'::public.calendar_location_region
where location_region in ('gyeonggi'::public.calendar_location_region, 'incheon'::public.calendar_location_region);

update public.inquiry_drafts
set category = case
  when category in ('general'::public.inquiry_category, 'account'::public.inquiry_category) then 'service'::public.inquiry_category
  when category = 'bug'::public.inquiry_category then 'incident'::public.inquiry_category
  when category = 'partnership'::public.inquiry_category then 'suggestion'::public.inquiry_category
  else category
end
where category in (
  'general'::public.inquiry_category,
  'bug'::public.inquiry_category,
  'account'::public.inquiry_category,
  'partnership'::public.inquiry_category
);

update public.inquiries
set category = case
  when category in ('general'::public.inquiry_category, 'account'::public.inquiry_category) then 'service'::public.inquiry_category
  when category = 'bug'::public.inquiry_category then 'incident'::public.inquiry_category
  when category = 'partnership'::public.inquiry_category then 'suggestion'::public.inquiry_category
  else category
end
where category in (
  'general'::public.inquiry_category,
  'bug'::public.inquiry_category,
  'account'::public.inquiry_category,
  'partnership'::public.inquiry_category
);

update public.profiles
set activity_region = 'gyeonggi_incheon'
where activity_region in ('gyeonggi', 'incheon');

update public.signup_requests
set activity_region = 'gyeonggi_incheon'
where activity_region in ('gyeonggi', 'incheon');
