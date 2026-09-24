-- Direct media uploads: Cloudflare Stream creator uploads and signed image
-- uploads. Videos no longer pass through the Next.js server in production.
-- Draft reports stay private until required media is ready.

create type public.media_provider as enum (
  'cloudflare-stream',
  'supabase-storage',
  'local'
);

create type public.media_upload_status as enum (
  'pending',
  'uploading',
  'processing',
  'ready',
  'failed'
);

create type public.report_publish_status as enum (
  'draft',
  'published'
);

alter table public.reports
  add column if not exists publish_status public.report_publish_status not null default 'published';

comment on column public.reports.publish_status is
  'draft reports are only visible to the reporter until required media uploads are ready.';

create index reports_publish_status_idx on public.reports (publish_status);

alter table public.report_media
  add column if not exists provider public.media_provider not null default 'local',
  add column if not exists provider_asset_id text,
  add column if not exists upload_status public.media_upload_status not null default 'ready';

comment on column public.report_media.provider_asset_id is
  'Canonical asset id at the provider. For Cloudflare Stream this is the video UID, not an embed URL.';
comment on column public.report_media.media_url is
  'Playback or presentation URL. Not the canonical identifier for Cloudflare videos.';
comment on column public.report_media.upload_status is
  'pending/uploading/processing until the asset is ready to show on a published report.';

create index report_media_upload_status_idx on public.report_media (upload_status);
create index report_media_provider_asset_idx on public.report_media (provider, provider_asset_id);

drop policy if exists "Reports are publicly readable" on public.reports;
create policy "Published reports are publicly readable"
  on public.reports
  for select
  to anon, authenticated
  using (
    publish_status = 'published'
    or created_by = auth.uid()
    or public.is_admin()
  );

drop policy if exists "Report media is publicly readable" on public.report_media;
create policy "Published report media is publicly readable"
  on public.report_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.reports
      where reports.id = report_media.report_id
        and (
          reports.publish_status = 'published'
          or reports.created_by = auth.uid()
          or public.is_admin()
        )
    )
  );

grant usage on type public.media_provider to anon, authenticated;
grant usage on type public.media_upload_status to anon, authenticated;
grant usage on type public.report_publish_status to anon, authenticated;

grant insert (publish_status) on table public.reports to authenticated;
grant update (publish_status, uploaded_at) on table public.reports to authenticated;

grant insert (provider, provider_asset_id, upload_status) on table public.report_media to authenticated;
grant update (provider, provider_asset_id, upload_status, media_url, thumbnail_url) on table public.report_media to authenticated;
