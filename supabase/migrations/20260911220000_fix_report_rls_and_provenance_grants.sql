-- Correct overlapping report SELECT policies and provenance column grants.
-- Does not disable RLS. Authorization for rows remains RLS; GRANTs only allow
-- authenticated writers to set provenance columns on rows they already may mutate.

-- ---------------------------------------------------------------------------
-- PART 1: one SELECT policy on public.reports
-- Previous chain left both of these PERMISSIVE SELECT policies in place:
--   "Visible reports are publicly readable"   (20260910140000)
--   "Published reports are publicly readable" (20260911140000)
-- PostgreSQL ORs permissive policies, which made drafts and removed-but-published
-- rows publicly readable. Drop every overlapping SELECT name from that chain.
-- ---------------------------------------------------------------------------
drop policy if exists "Reports are publicly readable" on public.reports;
drop policy if exists "Visible reports are publicly readable" on public.reports;
drop policy if exists "Published reports are publicly readable" on public.reports;

create policy "Published non-removed reports are publicly readable"
  on public.reports
  for select
  to anon, authenticated
  using (
    (
      publish_status = 'published'
      and removed_at is null
    )
    or created_by = auth.uid()
    or public.is_admin()
  );

-- Media must follow the same parent-report rule. Otherwise a removed published
-- report still exposes files through "Published report media is publicly readable"
-- (20260911140000), which only checked publish_status / owner / admin.
drop policy if exists "Report media is publicly readable" on public.report_media;
drop policy if exists "Published report media is publicly readable" on public.report_media;

create policy "Published non-removed report media is publicly readable"
  on public.report_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and (
          (
            reports.publish_status = 'published'
            and reports.removed_at is null
          )
          or reports.created_by = auth.uid()
          or public.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- PART 2: column privileges for provenance fields added in 20260911210000
-- Insert/update of these columns is still limited by report_media RLS
-- (reporter owns the parent report).
-- ---------------------------------------------------------------------------
grant insert (provenance_type, original_sha256)
  on table public.report_media to authenticated;
grant update (provenance_type, original_sha256)
  on table public.report_media to authenticated;
