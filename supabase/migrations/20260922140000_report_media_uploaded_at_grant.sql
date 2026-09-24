-- Completing a media upload sets uploaded_at. Column-level UPDATE grants from
-- 20260910120000 and 20260911140000 omitted it, so ready photos/videos could
-- fail after the file itself was stored.

grant update (uploaded_at) on table public.report_media to authenticated;
