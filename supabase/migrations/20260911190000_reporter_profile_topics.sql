-- Optional coverage topics on the existing reporter profile.
-- Do not duplicate username, display_name, bio, avatar_url, or home location.

create type public.reporter_topic as enum (
  'local_news',
  'politics',
  'public_safety',
  'transportation',
  'business',
  'protests',
  'weather',
  'community',
  'other'
);

alter table public.profiles
  add column if not exists topics public.reporter_topic[] not null default '{}';

comment on column public.profiles.topics is
  'Optional subjects this reporter usually covers. Not a credential, beat assignment, or verification.';

alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 500);

grant usage on type public.reporter_topic to anon, authenticated;
grant update (topics) on table public.profiles to authenticated;
