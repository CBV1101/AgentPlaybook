# Firsthand

Firsthand is a location-first platform for crowdsourced firsthand reporting.

## Product

The core loop is:

1. Someone wants to know what is happening somewhere.
2. They create a **coverage request** for a place.
3. Other people indicate they want it covered.
4. Someone publishes **firsthand reporting** from that place (photos, video, a written account, or a **live** broadcast).
5. People browse the original reporting, including recordings of ended live reports.
6. Reporters build a public reporting history.

Reports can also be published independently, without answering a request. Breaking news can also be grouped into an **event** at a location without replacing the place archive.

## Core product principle

Firsthand does not determine whether a reporter's conclusions are true.

The platform organizes firsthand reporting and preserves information about:

- reporter
- location
- capture time
- upload time
- coverage request (when the report answers one)
- event (when the report is attached to one)
- original media
- media provenance (creator declaration today; not authenticity or truth)
- licensing status

Public pages state that a report is a firsthand account, not a verified finding.

## Current features

These features exist in this repository:

- **Accounts** — Sign up, log in, and log out. Auth is email/password. With `FIRSTHAND_USE_MOCK=1` this is stored on disk; otherwise it uses Supabase Auth. Global navigation keeps Explore, Coverage wanted, and Following as primary links. **+ Report** opens publish, go live, request coverage, and create event. Profile, licensing, notifications settings, and admin moderation live in the account menu. On small screens a bottom bar (Explore, Wanted, Report, Following, Profile) replaces the crowded desktop header.
- **Coverage wanted** — `/wanted` lists open coverage requests by public demand (people who want it covered), with country/city filters and optional nearby distance. The homepage **Coverage wanted** section surfaces unanswered and under-covered questions. “Report on this” opens the existing report form for that request. There are no monetary bounties yet.
- **Request interest** — People can back an open request (“I want this covered too”).
- **Firsthand reports** — Authenticated users publish a title, description, capture time, location, media, and a firsthand attestation.
- **Photos and videos** — At least one photo or video is required to publish a recorded report. The browser uploads media **directly** to Cloudflare Stream (on-demand videos) or Supabase Storage (photos). The Firsthand server only mints short-lived upload URLs after authenticating the reporter. Reports stay in **draft** until required media is `ready`. In explicit mock mode (`FIRSTHAND_USE_MOCK=1`), files are stored under `.local/media`. Firsthand records **media provenance** (creator declaration, original filename, capture/upload time, provider id, and SHA-256 of original bytes when those bytes are available). It does not stamp media as verified, authentic, or true. See `docs/media-provenance.md`.
- **Live firsthand reporting** — Authenticated reporters can **Go live** from the homepage, a place, an active event, or a coverage request (`/live/new`). The browser asks for camera and microphone permission, previews, then publishes with Cloudflare Stream Live (WHIP). Viewers watch at `/live/[id]` labeled **LIVE FIRSTHAND REPORT** (never verified, true, or confirmed). Discovery: homepage **LIVE NOW**, event **LIVE FROM THIS EVENT**, place **LIVE FROM HERE**, reporter profile **LIVE NOW**, plus live map markers. When the broadcast ends, the row stays as `ended`, Cloudflare’s automatic recording is attached as a normal published report, and `/live/[id]` remains as the archive. Unexpected disconnects mark the stream `failed` (heartbeat ~20s; stale after 75s) so it is not left **LIVE**. Stream keys / WHIP URLs are never stored in public client-readable columns; only the Live Input UID is persisted. The Cloudflare API token stays on the server. In mock mode (no Cloudflare credentials) discovery, watch, and end-to-recording use a sample video; the studio previews the local camera but does not talk to a real WHIP endpoint.
- **Locations** — Places are first-class records (country, city, optional place name, coordinates, slug). A report may attach to a city-level location when a landmark is not appropriate.
- **Geographic browse** — `/browse` lists active countries and cities. `/country/[countrySlug]` and `/city/[citySlug]` are derived from location data, not a hard-coded list of countries. `/place/[slug]` remains the detailed place archive.
- **Place archives** — `/place/[slug]` shows overview, open questions, latest reports, and historical reports, with sort and media/licensing filters.
- **Discovery map** — The homepage map (Leaflet + OpenStreetMap) shows locations with reports, open requests, or live broadcasts and fits those points automatically. Filled rose markers mean someone is live there now.
- **Search** — Location search surfaces countries, cities, and specific places (for example “Berlin” and “Görlitzer”), plus Nominatim geocoding via `/api/geocode`.
- **Reporter profiles** — Public `/u/[username]` is a reporting portfolio (firsthand reports, places covered, community support, followers, available footage, and optional coverage topics). Logged-in users can follow reporters. `/profile` is where reporters set up or edit that public page (photo, name, username, home city/country, short bio, topics) and, separately, account settings (notifications, licensing, logout). New accounts are prompted to finish the profile but can still browse. Publishing a report or going live requires a display name, username, and home city/country. Activity counts are never typed in by the reporter.
- **Community support** — Logged-in users can support a report once (`report_supports`). This is not accuracy, truth, or verification. Paid tips are shown as coming later and are not processed.
- **Licensing inquiries** — When a report is **available for licensing**, buyers can submit an inquiry (organization, email, intended use, message). Statuses: inquiry, discussing, agreed, declined. An inquiry does not grant rights or take payment.
- **Events** — `/events/[id]` groups firsthand reports and coverage requests around a specific occurrence at a location (`active`, `ended`, or `archived`). Locations stay permanent archives. Authenticated users create events at `/events/new`. Reports and requests may optionally attach to an active event at the same location. The homepage **Happening now** section lists active events. An event is not a conclusion about what happened.
- **Following feed** — `/following` is a chronological feed of new reports from followed reporters and new reports/requests from followed locations.
- **In-app notifications** — `/notifications` is the inbox (bell in the header, also in the account menu). Events include followed-reporter reports, followed-location reports, high-interest coverage demand, coverage responses, livestreams, and licensing. Email, SMS, and push are not sent yet. Nearby demand uses home city and followed locations, not live GPS.
- **Licensing status** — Each report is **view only** or **available for licensing**.
- **Moderation** — Authenticated users can flag a report, coverage request, or live stream with a reason. Admins (`profiles.role = admin`) use `/admin/moderation` to review, dismiss, or remove content from public view. Removed live streams are `terminated`. There is no automated or AI moderation.
- **Publishing rules** — Publish forms show platform rules (original media, no private information, threats, harassment, or illegal content) and a warning about allegations involving identifiable people.
- **Local/mock development** — Set `FIRSTHAND_USE_MOCK=1` to use a JSON mock database (`.local/mock-db.json`) seeded to match the SQL schema. Production never uses this store. See `docs/development-data.md`.
- **Supabase production architecture** — Postgres schema, RLS, Auth, and Storage are defined in `supabase/migrations/`. Production requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Missing those values is a configuration error, not mock mode.

Not built yet: comments, messaging, payments, AI/automated moderation, reporter verification, or scoring “truth” or accuracy.

## Architecture

| Piece | Role |
| --- | --- |
| **Next.js** (App Router) | App, routes, server actions, API routes |
| **TypeScript** | Application code |
| **Tailwind CSS** | UI |
| **Supabase** | Postgres, Auth, Storage, RLS for live mode |
| **Cloudflare Stream** | On-demand video (Direct Creator Uploads, tus + basic) **and** live video (Live Inputs, WHIP in the browser, automatic recording) |
| **Leaflet** | Discovery map (OSM tiles) |

Data access is a facade in `lib/data/index.ts`. The source is chosen in `lib/data/mode.ts`:

- **`lib/data/mock/repository.ts`** — used only when `FIRSTHAND_USE_MOCK` is set and `NODE_ENV` is not `production`. Persistence is `.local/mock-db.json`. Session cookie: `firsthand_mock_user`.
- **`lib/data/supabase/repository.ts`** — used in production always, and in development when mock mode is off and public Supabase env is set.

`lib/database.types.ts` mirrors the SQL schema for both modes. Showcase files under `lib/*-showcase.ts` are presentation-only and cannot run in production.

### Media uploads

Large files must not pass through the Next.js application server.

1. The reporter submits **report metadata** (title, description, location, attestation). Firsthand creates a **draft** report.
2. The browser asks Firsthand for a one-time upload session. Firsthand authenticates the user, then calls Cloudflare Stream (`direct_user` tus or `/stream/direct_upload`) or Supabase Storage (`createSignedUploadUrl`). The Cloudflare API token never reaches the browser.
3. The browser uploads to that URL. Videos ≥ 5MB use **tus** (resumable). Smaller videos can use a basic POST. Photos PUT to a signed Supabase URL.
4. Firsthand stores `provider` + `provider_asset_id` (the Stream **UID**, not the embed URL), playback `media_url`, thumbnail, and `upload_status` (`pending` → `uploading` → `processing` → `ready` / `failed`).
5. When every required asset is `ready`, the reporter publishes. Drafts are hidden from public feeds.

Mock / local development with `FIRSTHAND_USE_MOCK=1` uses `/api/media/local-upload` and `.local/media` instead of Stream for recorded uploads, and a sample MP4 plus local camera preview for live. Those local paths are for explicit mock development only. They are not used when Supabase Storage or Cloudflare fails, and they are not a multi-viewer real-time network.

### Live video

1. The reporter submits title, location, and optional event / coverage request. Firsthand creates a `live_streams` row (`created`).
2. The browser asks Firsthand `/api/live/session`. Firsthand authenticates the owner, then creates or reads a Cloudflare **Live Input** (`recording.mode = automatic`). Only the WHIP URL for that session is returned. The API token never reaches the browser.
3. The browser captures camera + microphone and POSTs SDP to Cloudflare WHIP. Firsthand marks the row `live` and the reporter sends heartbeats.
4. Viewers play the Stream iframe for that Live Input UID at `/live/[id]`.
5. On end (or stale disconnect), Firsthand marks `ended` or `failed`, disables the input, lists Cloudflare recordings, and publishes a normal report with the same reporter, location, event, request, and start/end times.

If WHIP is unavailable in a given environment, do not fake a live product. Native/app work remaining: a WHIP-capable client using the same `/api/live/session` credentials (for example a future mobile app). This web app already implements browser WHIP when Cloudflare is configured.

## Database

Primary relationship:

**Reporter → Location → Coverage Request → Report → Media**

- **profiles** — Reporter identity (`username`, display name, bio, avatar, home city/country, optional `topics`) and a simple `role` (`member` or `admin`).
- **locations** — The place being covered.
- **events** — A time-bound occurrence at a location. Groups reports and requests. Not a verified finding.
- **coverage_requests** — A question about a location. `created_by` is the requester. `event_id` is optional. `removed_at` hides removed requests.
- **request_interests** — Who wants a request covered.
- **reports** — A firsthand account. `request_id` is optional (independent reports). `event_id` is optional. Stores `captured_at`, `uploaded_at`, `licensing_status`, and `publish_status` (`draft` until media is ready). `removed_at` hides removed reports.
- **report_media** — Photos and videos on a report. Canonical video id is `provider_asset_id` (Cloudflare Stream UID). `media_url` is playback/embed only. `upload_status` tracks transfer and processing.
- **live_streams** — A live firsthand broadcast. Stores reporter, location, optional event and coverage request, Cloudflare Live Input UID (not a stream key), status (`created` / `live` / `ended` / `failed` / `terminated`), title, start/end times, and the archive `report_id` after recording.

Future-facing tables exist in migrations and the mock store. They record events only; they do not store a reputation score, star rating, or accuracy percentage:

- **profile_follows** — Who follows a reporter. Used for the Following feed and in-app notifications.
- **location_follows** — Interest in a country, city, or place. Country follows use a `country-*` hub location row; city follows use the city-level location (`place` null). Used for the Following feed and in-app notifications.
- **notifications** — In-app inbox rows generated from coverage-loop events. `notification_preferences` stores coarse switches (reporter, location, coverage responses, livestreams, licensing).
- **report_supports** — Community support for a report (not a quality grade). One row per user per report.
- **report_corrections** — Later corrections attached to a report.
- **licensing_transactions** — Licensing inquiries (contact fields, intended use, status). No checkout. Future Stripe Connect payments should key off these rows rather than adding payment columns now.

**moderation_reports** stores human flags (`content_type`, `content_id`, `reason`, `details`, `status`).

Schema lives in:

- `supabase/migrations/20260910120000_init_firsthand_schema.sql`
- `supabase/migrations/20260910124300_report_image_storage.sql`
- `supabase/migrations/20260910130000_reporter_reputation_signals.sql`
- `supabase/migrations/20260910140000_moderation_reports.sql`
- `supabase/migrations/20260911090000_licensing_inquiries.sql`
- `supabase/migrations/20260911120000_events.sql`
- `supabase/migrations/20260911140000_direct_media_uploads.sql`
- `supabase/migrations/20260911150000_report_image_signed_uploads.sql`
- `supabase/migrations/20260911160000_live_streams.sql`
- `supabase/migrations/20260911170000_live_moderation_safety.sql`
- `supabase/migrations/20260911180000_notifications.sql`

Do not delete these migrations.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local mock store

Mock data no longer appears just because Supabase keys are missing. In `.env.local`:

```
FIRSTHAND_USE_MOCK=1
```

Then `npm run dev`. The app:

- Seeds mock reporters, places, requests, reports, events, and live streams
- Stores new data in `.local/mock-db.json`
- Stores uploaded media in `.local/media` (development-only local uploads)
- Shows a banner that mock mode is on

Demo login: `jordan@firsthand.local` / `firsthand` (admin). Other seeded accounts use the same password (for example `priya@firsthand.local`).

`npm run dev` also allows **showcase presentation** (fictional grids for UI work) even when you are connected to a real, empty Supabase project. Production cannot use showcase or mock. Details: `docs/development-data.md`.

### Connect Supabase later

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set **server-only** `SUPABASE_SERVICE_ROLE_KEY` so published report photos can be signed. Never use `NEXT_PUBLIC_` for the service role.
3. Apply **all** files in `supabase/migrations/` to the project (SQL editor or Supabase CLI).
4. Optionally set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` for on-demand **and** live Stream. Never expose the token to the browser.
5. Restart `npm run dev`. Leave `FIRSTHAND_USE_MOCK` unset (or set it to `0`) so repositories talk to Supabase. Showcase presentation may still fill sparse development screens; it never runs in production.

Set `profiles.role = 'admin'` in the database for anyone who should open `/admin/moderation`.

## Future payments (not built)

Stripe is not integrated. When it is, use Stripe Connect rather than new columns on reports:

- One-time tips and monthly support attach to `report_supports` (or a later payments table keyed by that id).
- Licensing charges attach after a `licensing_transactions` row is `agreed`.
- Platform fees belong on the Connect payment (`application_fee_amount`), documented in `lib/payments.ts`.

## Security

Never commit:

- `.env.local`
- API keys
- Supabase service role or other secrets
- Cloudflare credentials

`.env.example` may list variable **names** only. Real values stay in gitignored env files. `.local/` (mock database and generated media) is also gitignored.

## Scripts

- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run test:media-authorization` — private report photo authorization invariants
- `npx tsc --noEmit` — TypeScript check
