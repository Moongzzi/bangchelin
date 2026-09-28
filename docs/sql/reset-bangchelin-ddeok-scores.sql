begin;

do $$
begin
  if not exists (
    select 1
    from public.minigames
    where slug = 'bangchelin-ddeok'
  ) then
    raise exception 'Minigame bangchelin-ddeok was not found. No records were deleted.';
  end if;
end;
$$;

with deleted_records as (
  delete from public.minigame_score_records
  where game_id = (
    select id
    from public.minigames
    where slug = 'bangchelin-ddeok'
  )
  returning id
)
select count(*) as deleted_record_count
from deleted_records;

commit;
