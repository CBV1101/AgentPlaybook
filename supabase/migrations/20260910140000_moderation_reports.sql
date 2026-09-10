-- Human moderation reports. No automated or AI review in this migration.

create type public.profile_role as enum ('member', 'admin');
create type public.moderation_content_type as enum ('firsthand_report', 'coverage_request');
create type public.moderation_reason as enum (
  'harassment',
  'threats',
  'doxxing',
  'graphic_content',
  'copyright',
  'misleading_ownership',
  'illegal_content',
  'other'
);
create type public.moderation_status as enum ('open', 'reviewed', 'dismissed', 'removed');

alter table public.profiles
  add column role public.profile_role not null default 'member';

comment on column public.profiles.role is
  'Simple access role. admin can use the human moderation page. Not a reputation score.';

alter table public.reports
  add column removed_at timestamptz;

alter table public.coverage_requests
  add column removed_at timestamptz;

comment on column public.reports.removed_at is
  'Set when a moderator removes the report from public view. Null means visible.';
comment on column public.coverage_requests.removed_at is
  'Set when a moderator removes the request from public view. Null means visible.';

create index reports_visible_uploaded_at_idx
  on public.reports (uploaded_at desc)
  where removed_at is null;
create index coverage_requests_visible_open_idx
  on public.coverage_requests (created_at desc)
  where removed_at is null and status = 'open';

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  content_type public.moderation_content_type not null,
  content_id uuid not null,
  reason public.moderation_reason not null,
  details text,
  created_at timestamptz not null default now(),
  status public.moderation_status not null default 'open',
  constraint moderation_reports_details_length check (
    details is null or char_length(details) <= 5000
  )
);

create index moderation_reports_status_created_at_idx
  on public.moderation_reports (status, created_at desc);
create index moderation_reports_content_idx
  on public.moderation_reports (content_type, content_id);

comment on table public.moderation_reports is
  'User-submitted flags for human review. No automated moderation or bans.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.moderation_reports enable row level security;
alter table public.moderation_reports force row level security;

drop policy "Reports are publicly readable" on public.reports;
create policy "Visible reports are publicly readable"
  on public.reports
  for select
  using (removed_at is null or created_by = auth.uid() or public.is_admin());

drop policy "Coverage requests are publicly readable" on public.coverage_requests;
create policy "Visible coverage requests are publicly readable"
  on public.coverage_requests
  for select
  using (removed_at is null or created_by = auth.uid() or public.is_admin());

create policy "Authenticated users submit moderation reports"
  on public.moderation_reports
  for insert
  to authenticated
  with check (submitted_by = auth.uid() and status = 'open');

create policy "Reporters read their own moderation reports"
  on public.moderation_reports
  for select
  to authenticated
  using (submitted_by = auth.uid() or public.is_admin());

create policy "Admins update moderation reports"
  on public.moderation_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins update any firsthand report"
  on public.reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins update any coverage request"
  on public.coverage_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant execute on function public.is_admin() to anon, authenticated;

grant usage on type public.profile_role to anon, authenticated;
grant usage on type public.moderation_content_type to anon, authenticated;
grant usage on type public.moderation_reason to anon, authenticated;
grant usage on type public.moderation_status to anon, authenticated;

grant select on table public.moderation_reports to authenticated;
grant insert (submitted_by, content_type, content_id, reason, details)
  on table public.moderation_reports to authenticated;
grant update (status) on table public.moderation_reports to authenticated;

grant update (removed_at) on table public.reports to authenticated;
grant update (removed_at, status) on table public.coverage_requests to authenticated;
