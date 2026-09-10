-- Firsthand core schema
--
-- Reports are structured records (who, where, when, what, media), not opaque posts.
-- Identity, place, demand (requests/interest), and evidence (reports/media) are
-- separate tables so later features can attach without rewriting these cores:
--   reputation     -> events keyed to profiles / reports
--   followers      -> profile_follows / location_follows
--   donations      -> payments keyed to profiles or reports
--   recurring      -> support_subscriptions keyed to profiles
--   licensing buy  -> purchases keyed to report_media (and optionally reports)
--   newsrooms      -> organizations + memberships; nullable org_id on reports later

create extension if not exists pgcrypto;

create type public.coverage_request_status as enum ('open', 'fulfilled', 'closed');
create type public.licensing_status as enum ('view_only', 'licensing_available');
create type public.media_type as enum ('photo', 'video');

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Public reporter identity.
-- Do not store email, password, or auth factors here.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  bio text,
  avatar_url text,
  home_city text,
  home_country text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_display_name_length
    check (char_length(display_name) between 1 and 80)
);

create unique index profiles_username_key on public.profiles (username);
create index profiles_created_at_idx on public.profiles (created_at desc);

comment on table public.profiles is
  'Public reporter identity. Reputation, followers, and payouts should be additional tables keyed to profiles.id.';
comment on column public.profiles.id is
  'Same UUID as auth.users.id. The reporter for reports.created_by.';

-- ---------------------------------------------------------------------------
-- locations: first-class places shared by requests and reports.
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  city text not null,
  place text,
  latitude double precision,
  longitude double precision,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint locations_country_length check (char_length(country) between 1 and 80),
  constraint locations_city_length check (char_length(city) between 1 and 120),
  constraint locations_place_length check (place is null or char_length(place) between 1 and 160),
  constraint locations_slug_format check (slug ~ '^[a-z0-9-]{1,120}$'),
  constraint locations_lat_lng_together check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint locations_latitude_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint locations_longitude_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  )
);

create unique index locations_slug_key on public.locations (slug);
create index locations_country_city_idx on public.locations (country, city);
create index locations_geo_idx on public.locations (latitude, longitude)
  where latitude is not null and longitude is not null;

comment on table public.locations is
  'Canonical places. Browse, follows, and newsroom beats can key off locations.id. Precise geography can later use PostGIS without replacing these columns.';
comment on column public.locations.place is
  'Optional finer label (square, building, checkpoint). City-level records leave this null.';
comment on column public.locations.slug is
  'Stable public identifier for /browse URLs.';

-- ---------------------------------------------------------------------------
-- coverage_requests: "go here and report this"
-- ---------------------------------------------------------------------------
create table public.coverage_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  status public.coverage_request_status not null default 'open',
  constraint coverage_requests_title_length check (char_length(title) between 1 and 200),
  constraint coverage_requests_description_length check (
    description is null or char_length(description) <= 5000
  )
);

create index coverage_requests_created_by_idx on public.coverage_requests (created_by);
create index coverage_requests_location_id_idx on public.coverage_requests (location_id);
create index coverage_requests_created_at_idx on public.coverage_requests (created_at desc);
create index coverage_requests_open_created_at_idx
  on public.coverage_requests (created_at desc)
  where status = 'open';

comment on table public.coverage_requests is
  'Demand for firsthand coverage at a location. Interest count is derived from request_interests.';
comment on column public.coverage_requests.status is
  'open: still seeking reports; fulfilled: at least one accepted report; closed: withdrawn or expired.';

-- ---------------------------------------------------------------------------
-- request_interests: "I also want this covered"
-- ---------------------------------------------------------------------------
create table public.request_interests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.coverage_requests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint request_interests_unique_user unique (request_id, user_id)
);

create index request_interests_request_id_idx on public.request_interests (request_id);
create index request_interests_user_id_idx on public.request_interests (user_id);

comment on table public.request_interests is
  'One row per user per request. Unique (request_id, user_id) prevents duplicate backing.';

-- ---------------------------------------------------------------------------
-- reports: structured firsthand records
-- request_id is nullable so independent reporting is first-class.
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  request_id uuid references public.coverage_requests (id) on delete set null,
  location_id uuid not null references public.locations (id) on delete restrict,
  title text not null,
  description text,
  captured_at timestamptz not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  licensing_status public.licensing_status not null default 'view_only',
  constraint reports_title_length check (char_length(title) between 1 and 200),
  constraint reports_description_length check (
    description is null or char_length(description) <= 20000
  )
);

create index reports_created_by_idx on public.reports (created_by);
create index reports_request_id_idx on public.reports (request_id);
create index reports_location_id_idx on public.reports (location_id);
create index reports_captured_at_idx on public.reports (captured_at desc);
create index reports_uploaded_at_idx on public.reports (uploaded_at desc);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_licensing_status_idx on public.reports (licensing_status);

comment on table public.reports is
  'Firsthand report records. created_by is the reporter. Media lives in report_media. Licensing purchases should key off reports and/or report_media, not replace these rows.';
comment on column public.reports.created_by is
  'Reporter (profiles.id). Keep this as the human author even if a newsroom org_id is added later.';
comment on column public.reports.request_id is
  'Optional coverage request this report answers. Null means independent firsthand reporting.';
comment on column public.reports.captured_at is
  'When the reporter captured what they saw, not when it was uploaded.';
comment on column public.reports.uploaded_at is
  'When the report reached Firsthand.';
comment on column public.reports.licensing_status is
  'view_only or licensing_available. No checkout in this schema; purchases can reference this later.';

-- ---------------------------------------------------------------------------
-- report_media: evidence attached to a report
-- ---------------------------------------------------------------------------
create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  media_type public.media_type not null,
  media_url text not null,
  thumbnail_url text,
  original_filename text,
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  licensing_status public.licensing_status not null default 'view_only',
  created_at timestamptz not null default now(),
  constraint report_media_url_length check (char_length(media_url) between 1 and 2048),
  constraint report_media_thumbnail_length check (
    thumbnail_url is null or char_length(thumbnail_url) between 1 and 2048
  ),
  constraint report_media_filename_length check (
    original_filename is null or char_length(original_filename) between 1 and 260
  )
);

create index report_media_report_id_idx on public.report_media (report_id);
create index report_media_type_idx on public.report_media (media_type);
create index report_media_licensing_status_idx on public.report_media (licensing_status);

comment on table public.report_media is
  'Individual assets on a report. License purchases should reference report_media.id so a clip can be sold without splitting the parent report.';
comment on column public.report_media.licensing_status is
  'Per-asset licensing flag, independent of reports.licensing_status.';

-- ---------------------------------------------------------------------------
-- Auth: create a public profile when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  base_username := trim(both '_' from base_username);

  if base_username is null or char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  if char_length(base_username) > 24 then
    base_username := left(base_username, 24);
  end if;

  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := left(base_username, 24) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Reporter')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public read for discovery. Writes require auth. Owners manage their rows.
-- Locations are shared reference data: insert allowed, mutate not allowed.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.coverage_requests enable row level security;
alter table public.request_interests enable row level security;
alter table public.reports enable row level security;
alter table public.report_media enable row level security;

alter table public.profiles force row level security;
alter table public.locations force row level security;
alter table public.coverage_requests force row level security;
alter table public.request_interests force row level security;
alter table public.reports force row level security;
alter table public.report_media force row level security;

revoke all on table public.profiles from public;
revoke all on table public.locations from public;
revoke all on table public.coverage_requests from public;
revoke all on table public.request_interests from public;
revoke all on table public.reports from public;
revoke all on table public.report_media from public;

-- profiles
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- locations
create policy "Locations are publicly readable"
  on public.locations
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can create locations"
  on public.locations
  for insert
  to authenticated
  with check (true);

-- coverage_requests
create policy "Coverage requests are publicly readable"
  on public.coverage_requests
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users create their own requests"
  on public.coverage_requests
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners update their requests"
  on public.coverage_requests
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Owners delete their requests"
  on public.coverage_requests
  for delete
  to authenticated
  using (created_by = auth.uid());

-- request_interests
create policy "Request interests are publicly readable"
  on public.request_interests
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users express their own interest"
  on public.request_interests
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users remove their own interest"
  on public.request_interests
  for delete
  to authenticated
  using (user_id = auth.uid());

-- reports
create policy "Reports are publicly readable"
  on public.reports
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users publish their own reports"
  on public.reports
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners update their reports"
  on public.reports
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Owners delete their reports"
  on public.reports
  for delete
  to authenticated
  using (created_by = auth.uid());

-- report_media: ownership is the parent report's reporter
create policy "Report media is publicly readable"
  on public.report_media
  for select
  to anon, authenticated
  using (true);

create policy "Reporters add media to their reports"
  on public.report_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and reports.created_by = auth.uid()
    )
  );

create policy "Reporters update media on their reports"
  on public.report_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and reports.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and reports.created_by = auth.uid()
    )
  );

create policy "Reporters delete media on their reports"
  on public.report_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and reports.created_by = auth.uid()
    )
  );

-- Privileges: public read, authenticated write. Profile rows come from the trigger.
grant usage on schema public to anon, authenticated;
grant usage on type public.coverage_request_status to anon, authenticated;
grant usage on type public.licensing_status to anon, authenticated;
grant usage on type public.media_type to anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_url, home_city, home_country)
  on table public.profiles to authenticated;

grant select on table public.locations to anon, authenticated;
grant insert (id, country, city, place, latitude, longitude, slug)
  on table public.locations to authenticated;

grant select on table public.coverage_requests to anon, authenticated;
grant insert (id, created_by, location_id, title, description, status)
  on table public.coverage_requests to authenticated;
grant update (location_id, title, description, status)
  on table public.coverage_requests to authenticated;
grant delete on table public.coverage_requests to authenticated;

grant select on table public.request_interests to anon, authenticated;
grant insert (id, request_id, user_id)
  on table public.request_interests to authenticated;
grant delete on table public.request_interests to authenticated;

grant select on table public.reports to anon, authenticated;
grant insert (
  id,
  created_by,
  request_id,
  location_id,
  title,
  description,
  captured_at,
  uploaded_at,
  licensing_status
) on table public.reports to authenticated;
grant update (
  request_id,
  location_id,
  title,
  description,
  captured_at,
  licensing_status
) on table public.reports to authenticated;
grant delete on table public.reports to authenticated;

grant select on table public.report_media to anon, authenticated;
grant insert (
  id,
  report_id,
  media_type,
  media_url,
  thumbnail_url,
  original_filename,
  captured_at,
  uploaded_at,
  licensing_status
) on table public.report_media to authenticated;
grant update (
  media_type,
  media_url,
  thumbnail_url,
  original_filename,
  captured_at,
  licensing_status
) on table public.report_media to authenticated;
grant delete on table public.report_media to authenticated;
