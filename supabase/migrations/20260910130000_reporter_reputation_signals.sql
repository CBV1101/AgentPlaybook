-- Future reputation signals.
--
-- Do not store a star rating, generic reputation score, or "accuracy percentage".
-- Firsthand does not fact-check conclusions. Later reputation should be derived
-- from these event tables plus existing reports:
--   original reports          -> count of reports (and independent reports)
--   locations covered         -> distinct reports.location_id
--   followers                 -> profile_follows
--   community support         -> report_supports (not a quality grade)
--   corrections               -> report_corrections
--   licensing transactions    -> licensing_transactions

create type public.licensing_transaction_status as enum ('inquiry', 'completed', 'cancelled');

create table public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_not_self check (follower_id <> following_id),
  constraint profile_follows_unique unique (follower_id, following_id)
);

create index profile_follows_following_id_idx on public.profile_follows (following_id);
create index profile_follows_follower_id_idx on public.profile_follows (follower_id);

comment on table public.profile_follows is
  'Who follows a reporter. Follower count is derived. No score is stored here.';

create table public.location_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint location_follows_unique unique (user_id, location_id)
);

create index location_follows_location_id_idx on public.location_follows (location_id);
create index location_follows_user_id_idx on public.location_follows (user_id);

comment on table public.location_follows is
  'Interest in a place over time. Useful later for demand and reporter-place reputation.';

create table public.report_supports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint report_supports_unique unique (report_id, user_id)
);

create index report_supports_report_id_idx on public.report_supports (report_id);
create index report_supports_user_id_idx on public.report_supports (user_id);

comment on table public.report_supports is
  'Community support for a firsthand report. This is not a star rating or an accuracy grade.';

create table public.report_corrections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  summary text not null,
  created_at timestamptz not null default now(),
  constraint report_corrections_summary_length check (char_length(summary) between 1 and 2000)
);

create index report_corrections_report_id_idx on public.report_corrections (report_id);
create index report_corrections_created_by_idx on public.report_corrections (created_by);

comment on table public.report_corrections is
  'Later corrections attached to a report. Counts can inform reputation without scoring truth.';

create table public.licensing_transactions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete restrict,
  report_media_id uuid references public.report_media (id) on delete restrict,
  licensee_profile_id uuid references public.profiles (id) on delete restrict,
  status public.licensing_transaction_status not null default 'inquiry',
  created_at timestamptz not null default now()
);

create index licensing_transactions_report_id_idx on public.licensing_transactions (report_id);
create index licensing_transactions_licensee_idx on public.licensing_transactions (licensee_profile_id);

comment on table public.licensing_transactions is
  'Placeholder for professional licensing deals. No checkout or payment processing in this migration.';

alter table public.profile_follows enable row level security;
alter table public.location_follows enable row level security;
alter table public.report_supports enable row level security;
alter table public.report_corrections enable row level security;
alter table public.licensing_transactions enable row level security;

alter table public.profile_follows force row level security;
alter table public.location_follows force row level security;
alter table public.report_supports force row level security;
alter table public.report_corrections force row level security;
alter table public.licensing_transactions force row level security;

create policy "Profile follows are publicly readable"
  on public.profile_follows for select to anon, authenticated using (true);
create policy "Users follow reporters themselves"
  on public.profile_follows for insert to authenticated
  with check (follower_id = auth.uid());
create policy "Users unfollow themselves"
  on public.profile_follows for delete to authenticated
  using (follower_id = auth.uid());

create policy "Location follows are publicly readable"
  on public.location_follows for select to anon, authenticated using (true);
create policy "Users follow locations themselves"
  on public.location_follows for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users unfollow locations themselves"
  on public.location_follows for delete to authenticated
  using (user_id = auth.uid());

create policy "Report supports are publicly readable"
  on public.report_supports for select to anon, authenticated using (true);
create policy "Users support reports themselves"
  on public.report_supports for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users remove their support"
  on public.report_supports for delete to authenticated
  using (user_id = auth.uid());

create policy "Report corrections are publicly readable"
  on public.report_corrections for select to anon, authenticated using (true);
create policy "Users add their own corrections"
  on public.report_corrections for insert to authenticated
  with check (created_by = auth.uid());

create policy "Licensing transactions are publicly readable"
  on public.licensing_transactions for select to anon, authenticated using (true);

grant select on table public.profile_follows to anon, authenticated;
grant insert (id, follower_id, following_id) on table public.profile_follows to authenticated;
grant delete on table public.profile_follows to authenticated;

grant select on table public.location_follows to anon, authenticated;
grant insert (id, user_id, location_id) on table public.location_follows to authenticated;
grant delete on table public.location_follows to authenticated;

grant select on table public.report_supports to anon, authenticated;
grant insert (id, report_id, user_id) on table public.report_supports to authenticated;
grant delete on table public.report_supports to authenticated;

grant select on table public.report_corrections to anon, authenticated;
grant insert (id, report_id, created_by, summary) on table public.report_corrections to authenticated;

grant select on table public.licensing_transactions to anon, authenticated;
grant usage on type public.licensing_transaction_status to anon, authenticated;
