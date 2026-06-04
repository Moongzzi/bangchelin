alter table public.calendar_events
  drop constraint if exists calendar_events_created_by_profiles_fkey;

alter table public.calendar_events
  add constraint calendar_events_created_by_profiles_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete cascade
  not valid;

comment on constraint calendar_events_created_by_profiles_fkey on public.calendar_events
  is 'Allows PostgREST to embed the profile of the user who created a calendar event.';
