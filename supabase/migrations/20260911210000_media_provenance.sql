-- Media provenance foundation.
-- Records what Firsthand knows about where media came from.
-- Does not certify reporter conclusions, authenticity, or "truth."
--
-- Future C2PA manifests, capture-location accuracy, device attestation,
-- edited_since_capture, and trusted platform capture should key off
-- report_media.id (side table or additional columns) rather than a second media system.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'media_provenance_type'
      and n.nspname = 'public'
  ) then
    create type public.media_provenance_type as enum (
      'creator_declared',
      'platform_capture',
      'c2pa_verified',
      'unknown'
    );
  end if;
end
$$;

alter table public.report_media
  add column if not exists provenance_type public.media_provenance_type not null default 'unknown',
  add column if not exists original_sha256 text;

alter table public.report_media
  drop constraint if exists report_media_original_sha256_hex;

alter table public.report_media
  add constraint report_media_original_sha256_hex
  check (original_sha256 is null or original_sha256 ~ '^[0-9a-f]{64}$');

-- Historical uploads went through the firsthand attestation publish path.
-- Live recordings are provider transcodes, not original file uploads.
update public.report_media
set provenance_type = 'creator_declared'
where provenance_type = 'unknown'
  and coalesce(original_filename, '') <> 'live-recording.mp4';

update public.report_media
set provenance_type = 'unknown',
    original_sha256 = null
where original_filename = 'live-recording.mp4';

comment on type public.media_provenance_type is
  'What is known about media origin. creator_declared is a user attestation, not a determination that the file is authentic or the report is true. platform_capture and c2pa_verified are reserved until those systems exist; do not assign them without implementation.';

comment on column public.report_media.provenance_type is
  'Origin record for this asset. Not a truth or authenticity stamp.';

comment on column public.report_media.original_sha256 is
  'SHA-256 hex of original upload bytes when Firsthand actually received those bytes (local store or original image object). Client-computed hashes of files sent to Cloudflare may be stored for on-demand uploads. Never hash a transcoded playback derivative and call it original.';
