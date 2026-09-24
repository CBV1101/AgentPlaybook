-- Events: time-bound grouping of firsthand reporting at a location.
-- Locations stay permanent geographic archives. An event is not a conclusion
-- about what happened.

create type public.event_status as enum ('active', 'ended', 'archived');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  location_id uuid not null references public.locations (id) on delete restrict,
  title text not null,
  description text,
  status public.event_status not null default 'active',
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_title_length check (char_length(title) between 1 and 200),
  constraint events_description_length check (
    description is null or char_length(description) <= 5000
  ),
  constraint events_ended_after_start check (
    ended_at is null or ended_at >= started_at
  )
);

comment on table public.events is
  'A specific occurrence at a location over a period of time. Groups firsthand reports and coverage requests. Not a verified finding.';
comment on column public.events.status is
  'active = currently grouping reporting; ended = the occurrence is over; archived = hidden from discovery lists.';

create index events_location_id_idx on public.events (location_id);
create index events_status_started_at_idx on public.events (status, started_at desc);
create index events_created_by_idx on public.events (created_by);

alter table public.reports
  add column if not exists event_id uuid references public.events (id) on delete set null;

alter table public.coverage_requests
  add column if not exists event_id uuid references public.events (id) on delete set null;

create index reports_event_id_idx on public.reports (event_id);
create index coverage_requests_event_id_idx on public.coverage_requests (event_id);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute procedure public.set_events_updated_at();

create or replace function public.enforce_event_same_location()
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
    raise exception 'event must be at the same location as the report or request';
  end if;
  return new;
end;
$$;

create trigger reports_event_same_location
  before insert or update of event_id, location_id on public.reports
  for each row
  execute procedure public.enforce_event_same_location();

create trigger coverage_requests_event_same_location
  before insert or update of event_id, location_id on public.coverage_requests
  for each row
  execute procedure public.enforce_event_same_location();

alter table public.events enable row level security;
alter table public.events force row level security;

revoke all on table public.events from public;

create policy "Events are publicly readable"
  on public.events
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users create events"
  on public.events
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners update their events"
  on public.events
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant usage on type public.event_status to anon, authenticated;
grant select on table public.events to anon, authenticated;
grant insert (
  id,
  created_by,
  location_id,
  title,
  description,
  status,
  started_at,
  ended_at
) on table public.events to authenticated;
grant update (
  title,
  description,
  status,
  started_at,
  ended_at
) on table public.events to authenticated;

grant insert (event_id) on table public.reports to authenticated;
grant insert (event_id) on table public.coverage_requests to authenticated;
