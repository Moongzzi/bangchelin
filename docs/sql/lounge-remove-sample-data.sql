delete from public.lounge_activity_logs
where content_id in (
  select id
  from public.lounge_contents
  where slug in ('daily-quiz', 'random-game', 'ranking-hub', 'event-dock')
);

delete from public.lounge_contents
where slug in ('daily-quiz', 'random-game', 'ranking-hub', 'event-dock');

notify pgrst, 'reload schema';
