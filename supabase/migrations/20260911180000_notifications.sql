-- In-app notifications for the coverage loop.
-- Event generation is independent of delivery channel. This migration only
-- stores the in-app inbox. Email, SMS, and push are not sent here.

create type public.notification_type as enum (
  'new_report_from_followed_reporter',
  'new_report_from_followed_location',
  'coverage_request_in_followed_location',
  'coverage_request_response',
  'reporter_live',
  'live_in_followed_location',
  'licensing_inquiry',
  'licensing_status_change'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  coverage_request_id uuid references public.coverage_requests (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  live_stream_id uuid references public.live_streams (id) on delete set null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_message_length check (char_length(message) between 1 and 280)
);

create index notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create unique index notifications_once_per_report
  on public.notifications (user_id, type, report_id)
  where report_id is not null
    and type in (
      'new_report_from_followed_reporter',
      'new_report_from_followed_location',
      'coverage_request_response',
      'licensing_inquiry'
    );

create unique index notifications_once_per_live
  on public.notifications (user_id, type, live_stream_id)
  where live_stream_id is not null;

create unique index notifications_once_per_request_demand
  on public.notifications (user_id, type, coverage_request_id)
  where type = 'coverage_request_in_followed_location'
    and coverage_request_id is not null;

comment on table public.notifications is
  'In-app inbox rows. The same event payload can later be delivered by push or email without changing generation.';

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reporter_activity boolean not null default true,
  location_activity boolean not null default true,
  coverage_responses boolean not null default true,
  livestreams boolean not null default true,
  licensing boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Coarse in-app (and later channel) switches. Not per-location settings.';

alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users read their notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

create policy "Users insert their notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users update their notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.emit_in_app_notifications(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  actor uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    actor := nullif(item->>'actor_id', '')::uuid;
    if actor is not null and actor <> auth.uid() and not public.is_admin() then
      raise exception 'cannot emit notifications as another user';
    end if;

    insert into public.notifications (
      user_id,
      type,
      actor_id,
      location_id,
      event_id,
      coverage_request_id,
      report_id,
      live_stream_id,
      message
    )
    values (
      (item->>'user_id')::uuid,
      (item->>'type')::public.notification_type,
      actor,
      nullif(item->>'location_id', '')::uuid,
      nullif(item->>'event_id', '')::uuid,
      nullif(item->>'coverage_request_id', '')::uuid,
      nullif(item->>'report_id', '')::uuid,
      nullif(item->>'live_stream_id', '')::uuid,
      item->>'message'
    )
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.emit_in_app_notifications(jsonb) from public;
grant execute on function public.emit_in_app_notifications(jsonb) to authenticated;

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, update (
  user_id,
  reporter_activity,
  location_activity,
  coverage_responses,
  livestreams,
  licensing
) on table public.notification_preferences to authenticated;
