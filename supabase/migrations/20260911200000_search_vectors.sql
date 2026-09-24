-- Lexical search vectors for Firsthand discovery.
-- Later transcript or embedding search can join on the same row ids
-- without replacing reports, events, requests, locations, or profiles.

create extension if not exists pg_trgm;

alter table public.locations
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(place, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(city, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(country, '')), 'B')
  ) stored;

alter table public.reports
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

alter table public.coverage_requests
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

alter table public.events
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

alter table public.profiles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(username, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(home_city, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(home_country, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(bio, '')), 'C')
  ) stored;

create index if not exists locations_search_vector_idx on public.locations using gin (search_vector);
create index if not exists reports_search_vector_idx on public.reports using gin (search_vector);
create index if not exists coverage_requests_search_vector_idx on public.coverage_requests using gin (search_vector);
create index if not exists events_search_vector_idx on public.events using gin (search_vector);
create index if not exists profiles_search_vector_idx on public.profiles using gin (search_vector);

create index if not exists locations_city_trgm_idx on public.locations using gin (city gin_trgm_ops);
create index if not exists locations_country_trgm_idx on public.locations using gin (country gin_trgm_ops);
create index if not exists locations_place_trgm_idx on public.locations using gin (place gin_trgm_ops);
create index if not exists reports_title_trgm_idx on public.reports using gin (title gin_trgm_ops);
create index if not exists coverage_requests_title_trgm_idx on public.coverage_requests using gin (title gin_trgm_ops);
create index if not exists events_title_trgm_idx on public.events using gin (title gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx on public.profiles using gin (display_name gin_trgm_ops);

comment on column public.locations.search_vector is
  'Lexical geography search. Semantic/embedding retrieval can add a side table keyed by locations.id.';
comment on column public.reports.search_vector is
  'Lexical title/description search. Transcript or embedding indexes should key off reports.id or report_media.id.';
comment on column public.coverage_requests.search_vector is
  'Lexical coverage-request search. Query understanding can sit in front of the same request ids.';
comment on column public.events.search_vector is
  'Lexical event search. Does not encode conclusions about what happened.';
comment on column public.profiles.search_vector is
  'Lexical reporter identity search. Home city/country are public profile fields, not private GPS.';
