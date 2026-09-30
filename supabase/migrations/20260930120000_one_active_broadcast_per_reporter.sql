-- One occupying broadcast (created or live) per reporter.
-- Extra historical occupying rows are failed first so the unique index can apply.

with ranked as (
  select
    id,
    row_number() over (partition by reporter_id order by created_at desc, id desc) as rn
  from public.live_streams
  where status in ('created', 'live')
)
update public.live_streams
set
  status = 'failed',
  ended_at = coalesce(ended_at, now())
where id in (select id from ranked where rn > 1);

create unique index live_streams_one_active_per_reporter
  on public.live_streams (reporter_id)
  where status in ('created', 'live');

comment on index public.live_streams_one_active_per_reporter is
  'A reporter may occupy at most one created or live broadcast. ended, failed, and terminated do not take the slot.';
