-- Live firsthand reporting via Cloudflare Stream Live Inputs.
-- Stream keys / WHIP publish URLs are never stored. Playback uses the live input UID.

create type public.live_stream_status as enum (
  'created',
  'live',
  'ended',
  'failed',
  'terminated'
);

create table public.live_streams (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  event_id uuid references public.events (id) on delete set null,
  coverage_request_id uuid references public.coverage_requests (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  cloudflare_live_input_id text,
  recording_asset_id text,
  status public.live_stream_status not null default 'created',
  title text not null,
  started_at timestamptz,
  ended_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint live_streams_title_length check (char_length(title) between 1 and 200),
  constraint live_streams_ended_after_start check (
    ended_at is null or started_at is null or ended_at >= started_at
  )
);

comment on table public.live_streams is
  'A browser or app live firsthand broadcast. Cloudflare Stream Live holds ingest; this row is the public record.';
comment on column public.live_streams.cloudflare_live_input_id is
  'Cloudflare Live Input UID used for playback. Not a stream key.';
comment on column public.live_streams.recording_asset_id is
  'Cloudflare Stream video UID for the automatic recording after the broadcast ends.';
comment on column public.live_streams.status is
  'created = input ready; live = broadcasting; ended = finished with archive; failed = unexpected stop; terminated = taken down.';

create index live_streams_status_idx on public.live_streams (status, started_at desc);
create index live_streams_location_id_idx on public.live_streams (location_id);
create index live_streams_event_id_idx on public.live_streams (event_id);
create index live_streams_reporter_id_idx on public.live_streams (reporter_id);
create index live_streams_coverage_request_id_idx on public.live_streams (coverage_request_id);

create or replace function public.enforce_live_stream_event_location()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.events
    where events.id = new.event_id
      and events.location_id = new.location_id
  ) then
    raise exception 'event must be at the same location as the live stream';
  end if;
  return new;
end;
$$;

create trigger live_streams_event_same_location
  before insert or update of event_id, location_id on public.live_streams
  for each row
  execute procedure public.enforce_live_stream_event_location();

alter table public.live_streams enable row level security;
alter table public.live_streams force row level security;

revoke all on table public.live_streams from public;

create policy "Live and archived streams are publicly readable"
  on public.live_streams
  for select
  to anon, authenticated
  using (
    status in ('live', 'ended')
    or reporter_id = auth.uid()
    or public.is_admin()
  );

create policy "Authenticated users create their live streams"
  on public.live_streams
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Owners update their live streams"
  on public.live_streams
  for update
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin())
  with check (reporter_id = auth.uid() or public.is_admin());

grant usage on type public.live_stream_status to anon, authenticated;
grant select on table public.live_streams to anon, authenticated;
grant insert (
  id,
  reporter_id,
  location_id,
  event_id,
  coverage_request_id,
  cloudflare_live_input_id,
  status,
  title
) on table public.live_streams to authenticated;
grant update (
  status,
  started_at,
  ended_at,
  last_seen_at,
  report_id,
  recording_asset_id,
  cloudflare_live_input_id
) on table public.live_streams to authenticated;

alter type public.moderation_content_type add value if not exists 'live_stream';
