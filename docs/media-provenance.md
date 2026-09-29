# Media provenance

This document describes what Firsthand currently records about media origin, what it does not claim, and how stronger authenticity systems can be added later.

## Two different questions

**Media provenance:** What do we know about where this file came from?

**Claim truth:** Are the reporter’s statements true?

Firsthand may communicate provenance. Firsthand does **not** certify reporter conclusions, and it does not determine whether a video is “real,” “authentic,” or AI-generated.

Do not show **Verified**, **Authentic**, or **True** as media stamps.

## Current guarantees

For each `report_media` row Firsthand stores:

| Record | Meaning |
| --- | --- |
| Creator | The account that owns the parent report (`reports.created_by`) |
| Report | `report_id` |
| Original upload time | `uploaded_at` when the asset became ready |
| Capture time | `captured_at` when the reporter supplied it |
| Provider asset id | Cloudflare UID, Supabase Storage path, or local id |
| Media type | `photo` or `video` |
| Original filename | Client filename when supplied |
| Provenance type | See below |
| Original SHA-256 | Hex digest of **original upload bytes**, when those bytes were available |

### `provenance_type`

| Value | Current product |
| --- | --- |
| `creator_declared` | Assigned to normal report uploads. The publisher must attest they created or captured the media. This is a **declaration**, not a forensic finding. |
| `unknown` | Assigned when Firsthand did not receive an original file through the attested upload path. Live recordings use this today. |
| `platform_capture` | **Reserved.** Do not assign until a trusted in-product capture path exists (for example a Firsthand recorder with device/session attestation). |
| `c2pa_verified` | **Reserved.** Do not assign until C2PA manifests are parsed and checked. |

Public copy for current values:

- `creator_declared` → “Creator says they captured this media.”
- `unknown` → “Media origin not established.”

### Hashes

SHA-256 is stored only for original bytes:

- **Local uploads:** the server hashes the file it received.
- **Supabase image uploads:** the server hashes the stored object after the browser PUT (that object is the uploaded original, not a transcode).
- **Cloudflare Stream on-demand uploads:** the browser hashes the selected file **before** tus/basic transfer. Firsthand never sees those original bytes. The stored hash is therefore a client-computed digest of the file the reporter chose. Playback URLs are transcodes and must **not** be hashed as originals.
- **Livestream recordings:** Cloudflare (or the mock sample) produces a **recording derivative**. Firsthand does not hash it or call it an original upload.

If hashing fails (for example a very large file in the browser), the upload still proceeds and `original_sha256` stays empty.

## Current limitations

- Firsthand cannot tell generated, edited, or downloaded media from camera capture.
- Browser `capture="environment"` is a convenience for opening the camera. It is **not** device attestation. Pages and APIs must not treat it as trusted capture.
- A creator attestation can be false.
- A client-supplied Cloudflare hash can be false or can describe a file that is not camera-original.
- Existing seed / historical rows may have no hash.
- Livestream recordings are not `platform_capture` today: Firsthand does not yet attest the capture device, unsigned WHIP ingest, or the recording pipeline.

## Upload backends and limits

| Kind | Backend |
| --- | --- |
| Photo | Private Supabase Storage bucket `report-images` (signed browser PUT; signed GET via the app) |
| Recorded video | Cloudflare Stream (tus or basic Direct Creator Upload) |
| Live video | Cloudflare Stream Live (WHIP) — not this upload path |

Local disk (`.local/media` via `/api/media/local-upload`) is **only** available when `getDataSource() === "mock"` (explicit `FIRSTHAND_USE_MOCK=1` in development/test). It is never used because Storage or Cloudflare failed. Production always rejects local media.

Photo limits (aligned with the bucket): JPEG, PNG, WebP, GIF, HEIC/HEIF; max **15 MB**. Mock local files are capped at **50 MB**. Recorded video size is not capped in the app beyond Cloudflare’s Direct Upload / tus session (files ≥ 5 MB use tus).

The Storage bucket must exist on the live Supabase project (`storage.buckets`). Confirm with `npm run verify:report-images-storage` (linked CLI), not with an anonymous `GET /storage/v1/bucket/report-images` — that endpoint returns `NoSuchBucket` to the anon key even when the bucket exists. If Postgres or Storage policies are missing, run `supabase/manual/repair_report_image_storage.sql` in the SQL Editor. Firsthand does not create buckets at runtime and does not fall back to disk when Storage fails.

Object keys for photos are `{userId}/{reportId}/{uuid}.{ext}`. Client filenames are not used as paths. Durable identity is `provider = supabase-storage` plus `provider_asset_id` (the object path). `media_url` is not a permanent public authorization token; the app mints a 10-minute signed URL when the parent report is published and not removed (or when the owner/admin may view a draft/removed report). Anonymous users never receive a Storage RLS grant for report photos. Reporter avatars use the public `reporter-avatars` bucket. Removing a report sets `removed_at` and stops issuing new delivery URLs; previously issued signed URLs remain valid until that 10-minute TTL. Storage objects are **not** deleted today (orphan objects — not expanded in this change).


1. Authenticated session mints a short-lived URL.
2. The browser uploads to Cloudflare Stream or Supabase Storage.
3. The app server does not proxy original video bytes for Cloudflare uploads.
4. If that upload fails, the reporter sees an error. The app does not write `.local/media` in Supabase mode.

Do not route Cloudflare uploads through the Next.js server in order to hash them.

## Future trusted-capture architecture

Add capabilities **beside** this table, keyed by `report_media.id`, without replacing the search or media APIs:

1. **Trusted platform capture** — a Firsthand-controlled recorder (or signed live ingest) that can honestly set `platform_capture`, plus session/device evidence.
2. **C2PA** — store manifests and verification results; set `c2pa_verified` only after a real check. Keep failed or missing manifests as `unknown` or `creator_declared`.
3. **Capture location / accuracy** — optional GPS from a trusted recorder, with accuracy and whether the reporter supplied it.
4. **Device attestation** — hardware-backed statements when available.
5. **`edited_since_capture`** — from C2PA or similar, not from guessing.
6. **Transcripts / semantic search** — index original or transcoded text separately; do not treat them as provenance.

Until those systems exist, leave `platform_capture` and `c2pa_verified` unused.
