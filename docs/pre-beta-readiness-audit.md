# Firsthand pre-beta readiness audit

**Date:** 29 September 2026  
**Repository snapshot:** branch `cursor/independent-live-stream-grid` (working tree as inspected; no product code was changed for this audit)  
**Scope:** invite-only 10–20 person beta of the location-first reporting loop  
**Method:** code and schema inspection, typecheck, lint, production build, scripted tests. Playwright was **not** re-run successfully in this audit session (Chromium binary missing from the Playwright cache). UI claims below that depend on a live browser are marked **MANUAL TEST REQUIRED** unless previously measured in this repo.

This is an audit, not a punch list of new features.

---

## 1. Executive summary

The application **compiles** (TypeScript clean, `next build` succeeds) and has a **complete-looking product surface**: Home, Explore globe, Coverage Wanted, Following, reporter profiles, investigations, coverage requests, reports, live create/broadcast, in-app notifications, and admin moderation.

That is **not** the same as being ready for real invitees.

The core loop is **implemented in code** (request → discover → report/live → publish → in-app notify requester/followers → public discovery). It is **not** proven against a production-configured Supabase + Cloudflare + email stack in CI or in this audit. Several paths still **succeed while hiding failure** (local media fallback, notification dispatch `try/catch` that swallows errors, livestream `mock:local` when Cloudflare is unset).

If `NEXT_PUBLIC_SUPABASE_URL` / anon key are missing, the app runs **mock mode** (local JSON, demo login). A production host without those env vars would not be a real product.

**Verdict: not ready for a 10–20 person invite-only beta of real people without developer intervention.**

---

## 2. Current architecture

| Layer | Current state |
|---|---|
| App | Next.js **16.3.4** App Router, React **19.2.8** |
| Data switch | `lib/data/mode.ts`: **Supabase if public env is set, else mock** |
| Auth | Supabase Auth when configured; otherwise mock session + demo account |
| DB | Postgres via Supabase; 18 SQL migrations under `supabase/migrations/` |
| Media photos | Intended: signed **Supabase Storage**. Fallback: `/api/media/local-upload` → `.local/media` |
| Media video | Intended: **Cloudflare Stream** (tus/basic). Fallback: same local path |
| Livestream | Intended: **Cloudflare Live Inputs** (WHIP/WHEP). Fallback: `protocol: "mock"` / `cloudflare_live_input_id: local-{id}` |
| Geocoding | OpenStreetMap **Nominatim** (`lib/geocode.ts`, `/api/geocode`) |
| Maps | Leaflet Coverage Wanted; Three.js globe Explore/Home |
| Analytics | **None** (investigation events are no-ops) |
| Hosting / CI | **None in repo** (no Vercel config, no GitHub Actions, no `robots.txt`) |

### Environment variables

| Variable | Required for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Real data + auth (else mock) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Same |
| `CLOUDFLARE_ACCOUNT_ID` | Real video upload + real live |
| `CLOUDFLARE_STREAM_API_TOKEN` | Same |

`.env.example` documents this. No service-role key is used in app code (browser/server use anon + user JWT).

### Development showcase

Gated with `process.env.NODE_ENV === "development"` in `lib/homepage-showcase.ts`, `lib/discovery-showcase.ts`, `lib/investigation-showcase.ts`. IDs use `dev-showcase-` prefix. Next production builds inline `NODE_ENV=production`, so showcase branches are **dead in a production compile** if that gate is not bypassed.

Home also requires **fewer than 6 real live streams** before substituting showcase lives (`MIN_DEV_LIVE_GRID_STREAMS`).

---

## 3. Route inventory

Status key: **WORKING** = code path complete and internally consistent, not claiming untested production integrations. **PARTIAL** = UI + some backend, gaps. **PLACEHOLDER** = empty/no-op. **UNKNOWN / REQUIRES MANUAL TEST** = needs two real users / real providers.

| Route | Purpose | Auth | Data source | Status |
|---|---|---|---|---|
| `/` | Home: globe, Live Now grid, investigations, coverage, recent reports | No | Supabase feed **or** mock **or** dev showcase | **PARTIAL** (grid/nav coded; showcase vs real; live is file-preview in showcase) |
| `/browse` | Explore 3D Earth + search + Going On Now | No | Live list + Nominatim + showcase in dev | **PARTIAL** (e2e exists; Nominatim/live unproven in prod) |
| `/wanted` | Coverage Wanted one-world map + requests | No | Open requests + optional showcase | **PARTIAL** |
| `/following` | Live From Your World + Your World feed | Yes (`requireUser`) | Follows + feed; **dev showcase if no follows** | **PARTIAL** |
| `/investigations` | Public investigation index | No | Published investigations + dev extras | **PARTIAL** |
| `/u/[username]/investigations/[slug]` | Public investigation + parts | No | DB + showcase pages in dev | **PARTIAL** |
| `/u/[username]` | Public reporter “channel” | No | Profile assemble + showcase reporters in dev | **PARTIAL** |
| `/requests/new` | Create coverage request | Yes | `createCoverageRequest` → DB | **UNKNOWN / REQUIRES MANUAL TEST** |
| `/requests/[id]` | Request detail, interest, Report on this, Go live | Mixed | DB | **UNKNOWN / REQUIRES MANUAL TEST** |
| `/reports/new` | Create/upload/publish report | Yes + complete profile | Draft + media APIs | **UNKNOWN / REQUIRES MANUAL TEST** |
| `/reports/[id]` | Published report (showcase IDs redirect in **dev** to `/u/…`) | No | DB | **PARTIAL** |
| `/live/new` | Start livestream | Yes + complete profile | `createLiveStream` | **UNKNOWN / REQUIRES MANUAL TEST** |
| `/live/[id]/broadcast` | Reporter WHIP broadcast | Owner | Cloudflare or mock session | **UNKNOWN / REQUIRES MANUAL TEST** |
| `/live/[id]` | Viewer page | No | Real stream or **dev** showcase redirect to reporter | **PARTIAL** |
| `/login` `/signup` | Email/password | No | Supabase or mock | **UNKNOWN / REQUIRES MANUAL TEST** (Supabase); mock is **WORKING** locally |
| `/auth/callback` | Code/OTP exchange (signup, recovery, etc.) | No | Supabase | **PARTIAL** (no request-reset UI) |
| `/profile` | Own profile setup / account | Yes | Profiles | **PARTIAL** (setup exists; no password reset) |
| `/profile/investigations` (+ `/new`, `/[id]`) | Owner investigation editor | Yes + complete profile | DB | **PARTIAL** |
| `/profile/licensing` | Licensing inbox | Yes | DB | **PARTIAL** (not core loop) |
| `/notifications` | In-app inbox + preference form | Yes | `notifications` table | **PARTIAL** |
| `/admin/moderation` | Flags, remove, terminate, privileges | Admin role | DB | **PARTIAL** |
| `/search` | Search reports/places/people | No | Search vectors / mock | **PARTIAL** |
| `/city/[citySlug]` `/country/[countrySlug]` `/place/[slug]` | Geographic archives | No | Geography queries | **PARTIAL** |
| `/events/new` `/events/[id]` | Events (not the core loop) | Mixed | DB | **PARTIAL** |
| Settings | No dedicated `/settings` | — | Profile + notification prefs | **PLACEHOLDER** as a settings product; pieces live on `/profile` and `/notifications` |

No obviously **dead** compiled routes: all listed pages exist.

---

## 4. Core loop status

Intended loop:

1. User A creates coverage request (`createCoverageRequest` → `coverage_requests` + location).
2. User B discovers it (`/wanted`, home coverage section, notifications for followed locations / high interest).
3. User B **Report on this** → `/reports/new?requestId=` (login + complete profile required). Optional **Go live** → `/live/new?requestId=`.
4. Interest is **`request_interests` (demand), not exclusive assignment.** Multiple people can express interest. Duplicate insert is ignored (`23505`).
5. User B creates draft report, uploads media, `publishReport` requires all media `upload_status === "ready"`.
6. User A: `supabaseDispatchPublishedReport` → `planPublishedReport` → RPC `emit_in_app_notifications` with type `coverage_request_response` for request creator and supporters.
7. Public discovery: published reports on Home / location archives / reporter profile.

**Gaps that break “reliably”:**

- Notification write is **best-effort**; publish still succeeds if inbox write fails.
- Photo/video may land on **local disk** even when “Supabase is configured.”
- Live may be **mock protocol** even when “Supabase is configured.”
- No automated test of this loop against a real project.
- Existing manual checklist: `docs/pre-beta-manual-checklist.md` (not executed in this audit).

**CORE LOOP: PARTIAL**

---

## 5. Auth status

| Capability | Status |
|---|---|
| Signup email/password | Implemented (`signUp`) |
| Email verification | Relies on Supabase project settings; callback supports `signup` OTP + PKCE `code` |
| Login | Implemented |
| Logout | Implemented (`signOut`) |
| Session persistence | Supabase SSR cookies via `proxy.ts` → `updateSession` |
| Profile auto-create | `handle_new_user` trigger inserts `profiles` |
| Profile setup gate | `isReporterProfileComplete` (username, display name, home city/country) required to report/live |
| Password reset **request UI** | **Missing** |
| Recovery **callback** | Supported (`type=recovery` in `/auth/callback`) |
| Failed/expired link | Redirect to login with `error` query |
| Mock auth | Demo `jordan@firsthand.local` / `firsthand` when unconfigured |
| Invite allowlist | **None** in the app |

**Must be configured in the Supabase dashboard (not in this repo):** Site URL, Redirect URLs (`{origin}/auth/callback`), email templates, confirmations on/off.

**AUTH: PARTIAL** — code exists; production email/session flow is **MANUAL TEST REQUIRED**. Open signup is incompatible with “invite-only” unless disabled in Supabase.

---

## 6. Media status

### Photos

1. `POST /api/media/image-session` → `createMediaUploadSession`
2. If `NEXT_PUBLIC_SUPABASE_URL` set: signed Storage upload (`createSupabaseImageUpload`)
3. **On any thrown error, empty `catch` falls through to local upload**
4. `POST /api/media/local-upload` writes bytes via `writeLocalMediaFile` and sets `media_url` to a local `/api/local-media/…` URL
5. `POST /api/media/image-complete` for Storage completion

### Video

- Cloudflare Stream if `CLOUDFLARE_*` set
- Otherwise **same local upload protocol**

### Persistence / visibility

- Local files live under `.local/` (gitignored). They are **not** durable across deploys, not shared across instances, and **other users / other machines cannot see them**.
- Cross-user visibility of Storage/Cloudflare URLs depends on those providers being used successfully.
- Owner-only media mutations: `supabaseOwnedReport` / `supabaseOwnedMedia` check `created_by`.

### CAN LOCAL FALLBACK MASK PRODUCTION FAILURE?

**YES.**

`lib/data/supabase/repository.ts` `supabaseCreateMediaSession`: Storage errors are swallowed and the client is given `/api/media/local-upload` as if that were the intended production path. A reporter can “successfully” publish a report whose files exist only on the app server disk.

**REAL MEDIA: PARTIAL** (implementation present; production-safe path not enforced)

---

## 7. Livestream status

| Step | Implemented? | Notes |
|---|---|---|
| Create stream row | Yes | `createLiveStream` → `live_streams` |
| Cloudflare live input | Yes **if configured** | Failure marks stream `failed` |
| No Cloudflare | Yes, **degraded** | `cloudflare_live_input_id = local-{id}`, broadcast `protocol: "mock"`, `whipUrl: "mock:local"` |
| Discoverable while `live` | Yes | Public list `status = live`; stale heartbeat → `failed` |
| Viewer page | Yes | Real playback vs file preview vs showcase redirect |
| End / recording | Partial | Cloudflare recording flags in live input create; listing recordings in live-repository; not proven |
| Viewer counts | Yes when CF configured | TTL refresh; unknown if API fails (does not invent) |
| Showcase “live” | Dev-only file loop | **Not proof of livestreaming** |

**REAL LIVESTREAM: PARTIAL / FAIL for beta if Cloudflare is unset** — treating mock live as live would violate product truth.

Requires **manual phone/device** WHIP test. Not integration-tested in CI.

---

## 8. Home status

| Check | Result |
|---|---|
| “The world, reported by you.” | PASS (hero copy present) |
| Live Now compact grid | PASS in **dev showcase** at ~1600px (code: `LiveStreamGrid` + `variant="grid"` + 5 `1fr` tracks from 1500px). MANUAL if only 0–1 real lives in production |
| ~5 tiles wide desktop | PASS (layout + Playwright spec; Chromium not launched this session) |
| Stream click → reporter | PASS in code + e2e spec |
| Reporter click → reporter | PASS in code + e2e spec |
| Location navigation | PASS (links to `stream.location.href`) |
| Ongoing Investigations | PASS (section present; showcase extras in dev) |
| Coverage-request discovery | PASS (section) |
| Latest reporting | PASS (`ReportCard` list) |
| Showcase isolation | PASS if `NODE_ENV=production` |

Home Live Now **does not prove Cloudflare**. Showcase uses a sample MP4.

---

## 9. Explore status

| Check | Result |
|---|---|
| 3D Earth | PASS (Three.js `InteractiveGlobe`) |
| Search | PASS (Nominatim) — MANUAL for correctness under rate limits |
| Fly-to / marker same location | PASS in code; e2e/script location-live |
| Going On Now geo-anchored | PASS in code (`thumbnailPosition`) |
| Popup ≤280px | PASS (e2e spec) |
| Attached while globe moves | Intended; e2e arrows without globe motion |
| Multiple streams | PASS for showcase metros (Paris 3, NYC 7 in `test-location-live.ts`) |
| Popularity ordering | PASS for showcase viewer counts; **real** CF viewer counts when configured |
| Arrows size/position | PASS (e2e; 26–30px) |
| Arrows don’t navigate | PASS (e2e spec) |
| Stream → current reporter | PASS (e2e spec) |
| X closes | PASS (e2e spec) |
| No-live truthful | PASS (empty copy; location overlay) |
| Showcase leak to production | PASS (`NODE_ENV`) |

Nominatim has **no API key**, **no app-level rate limit**, User-Agent `FirsthandMVP/0.1`. Fine for tiny beta if usage is light; fragile if abused.

---

## 10. Coverage Wanted status

| Check | Result |
|---|---|
| One world map (`noWrap`) | PASS in code + e2e spec |
| Requests visible | PASS when data exists |
| Request creation | PASS (`/requests/new`) — MANUAL for DB |
| Location | Nominatim + stored lat/lng |
| Interest/demand | `expressInterest` / “I want this covered too” |
| Report on this | `/reports/new?requestId=` (showcase cards send `/requests/new` instead of a fake ID) |
| External vs Firsthand | Showcase “hot” opportunities labeled as external signals; **dev only** |
| Fabricated production activity | Should not, if production build + real empty DB |

---

## 11. Following status

| Check | Code support |
|---|---|
| Auth required | Yes |
| Compact live grid | Same `LiveStreamGrid` as Home |
| Your World feed | `assembleYourWorldFeed` + pagination `?before=` |
| Reporter / place / investigation follows | Tables + actions + `FollowButton` |
| Dedup | Feed assembler + tests (`test-your-world.ts`, `test-follows.ts` **passed**) |
| Investigation part context | Your World investigation rows (title / Part N / Continue) |
| Location / reporter links | Yes |
| Empty state | Yes |
| Dev showcase when no follows | Yes (`applyFollowingShowcase`) — **must not run in production** |

Not e2e-tested with a logged-in user.

---

## 12. Reporter status

| Check | Result |
|---|---|
| Public `/u/[username]` | Yes |
| Avatar/name/bio/home | Yes |
| Follow | Yes (not on own profile; showcase IDs skip some follow) |
| Live now | Yes (`liveNow` list; multiple streams mapped) |
| Reports / investigations tabs | Yes when data exists |
| Arrival from Home/Explore | Yes (`/u/{username}`) |
| Cannot edit others | Owner-only `/profile`; RLS `Users update their own profile` |
| Placeholder | Dev-only synthetic profiles for showcase usernames |

---

## 13. Investigations status

| Check | Result |
|---|---|
| Nav + `/investigations` | Yes |
| Published-only public list | RLS + repository filters |
| Reporter, location, part count, order | Yes (`position` on items) |
| Owner reorder/add | Profile editor; add checks `created_by` / `reporter_id` |
| Live part | Timeline uses `LivePreview` globeThumbnail (stays on page) |
| Follow investigation | `investigation_follows` + RLS |
| Delete investigation | Deletes investigation row; **items cascade**; **reports are not deleted** (`reports` FK is from items → reports, not investigation → reports) |
| Authz | Owner policies; non-owner add rejected in repository |

No investigation-update notification type.

---

## 14. Notifications status

In-app only. No email/push/SMS.

| Type | Trigger | DB write | Display | Read state | Link |
|---|---|---|---|---|---|
| `coverage_request_response` | Publish report tied to request | RPC `emit_in_app_notifications` | Inbox | `read_at` | `/reports/{id}` |
| `new_report_from_followed_reporter` | Publish | same | Inbox | same | report |
| `new_report_from_followed_location` | Publish | same | Inbox | same | report |
| `coverage_request_in_followed_location` | High-interest threshold (3 supporters) | on interest insert | Inbox | same | request |
| `reporter_live` / `live_in_followed_location` | Live start planner | live dispatch | Inbox | same | `/live/{id}` |
| `licensing_*` | Licensing flows | planner | Inbox | same | `/profile/licensing` |
| Investigation follow updates | — | **Missing** | — | — | — |

Publish/live dispatch **does not fail the user action** if emit fails.

Planner unit tests: **passed** (`scripts/test-notifications.ts`). End-to-end with two real accounts: **MANUAL**.

---

## 15. Security / RLS status

RLS is **enabled and forced** on core tables (init + later migrations). Sensitive objects:

| Object | Anon | Auth non-owner | Owner | Admin |
|---|---|---|---|---|
| `profiles` | Public read | Update own only | Update own | Role-based admin helpers |
| `coverage_requests` | Public read (moderation-visible) | Create own | Update/delete own | Moderation update |
| `request_interests` | Public read | Insert own | Delete own | — |
| `reports` | Published + not removed | Create own; **select draft if `created_by`** | Update/delete own | `is_admin()` select |
| `report_media` | Follows parent report visibility | Insert/update/delete via parent ownership | Same | Admin select |
| `investigations` / items | Published readable | Create/update/delete own | Own | — |
| `investigation_follows` | Public read | Own follow rows | Own | — |
| `notifications` | None | Own rows only | Own | — |
| `live_streams` | Live/archived public | Create own | Update own | Privilege/moderation |
| `moderation_reports` | Visible content rules | Submit; read own | — | Update |
| Storage report images | Public read policy on bucket | Upload to own folder | Delete own | — |

**`report_media` table GRANT SELECT to `anon` and `authenticated` remains** (`init` migration). Row access is still RLS. This is **broader privilege than ideal** but not an RLS bypass by itself.

**`grant update (can_live_stream) on profiles to authenticated`** exists; a **trigger** rejects non-admin changes to that column.

IDOR (code-level): report media, investigation attach, investigation delete, profile update, notification read, admin actions all check owner or `requireAdmin()`. Not a substitute for a live RLS penetration test.

**SECURITY: PARTIAL** (policies exist and look coherent; table GRANTs still wide; no live policy test in this audit)

---

## 16. Moderation status

| Capability | Exists |
|---|---|
| User flag report/request/live | Yes (`submitContentReport`) |
| Admin inbox | `/admin/moderation` |
| Dismiss flag | Yes |
| Remove report | Yes (`removeReportedContent`) |
| Sensitive content flag | Yes |
| Terminate livestream | Yes (moderation actions + live status) |
| Revoke live privilege | Yes (`can_live_stream`) |
| Admin gate | `profiles.role === "admin"` |

**Minimum still missing for a 10–20 person beta (do not build in this task):** documented on-call admin, at least one seeded admin user in the target project, and a simple process if nobody is watching `/admin/moderation`. Blocking/banning accounts is not a first-class flow.

---

## 17. Development showcase isolation

**Search hits:** `showcase`, `dev-showcase-`, mock repositories, Nominatim sample video URL, mock live protocol, `jordan@firsthand.local`.

**Production leakage mechanisms:**

1. `NODE_ENV === "development"` guards on showcase modules (Next inlines this in `next build`).
2. ID prefix `dev-showcase-` so leftover URLs can be detected.
3. Repositories are **not** supposed to import showcase modules.

**Insufficient / BLOCKER if mis-deployed:**

- **`isMockMode()` when Supabase env is missing** — a production deploy without keys serves **mock reporters, mock reports, demo login**. That is **not** the showcase module; it is the whole data layer.
- Local media URLs and mock WHIP if Cloudflare/Storage fail or are unset **while Supabase is configured**.

Showcase-only leakage in a correct production build: **not a blocker**. Mock-mode and local/mock live: **blockers**.

---

## 18. Analytics status

No vendor, no `gtag`, no first-party event sink.

`recordInvestigationEvent` is an empty function.

**None of the requested beta funnel events exist.** Loop failure diagnosis would be logs, support chat, and the in-app notification inbox.

---

## 19. Error handling

| Workflow | Loading | Empty | Failure feedback |
|---|---|---|---|
| Auth | Form post/redirect | — | Query `error` + `ErrorState` |
| Coverage request | Redirect | — | `?error=` |
| Report create | Client form return `{ok:false}` | — | Field errors |
| Upload | Progress in form | — | Thrown API JSON errors; **Storage miss becomes local success** |
| Publish | Client | — | Message if media not ready |
| Notifications | Page | EmptyState | Silent skip on emit failure |
| 404 | `notFound()` | — | Next default |
| Geocode | — | Empty results | 502 JSON |

No global error-monitoring product. Unexpected server errors: Next default, not a branded page.

---

## 20. Mobile / accessibility

### Mobile (code only; not a device lab)

- Home grid: 1 column `<650px`, then 2/3/4/5.
- Explore globe has fixed heights; Going On Now is small; arrows are 40px hit / 28px face.
- Coverage map uses Leaflet; previous wrap bug addressed with `noWrap`.
- Forms use standard fields; **MANUAL** on a phone for upload + live camera.

Likely P1 on device: globe + popup on small screens, live broadcast (WebRTC), file picker.

### Accessibility (spot check)

- Auth fields have labels.
- Explore close/prev/next have `aria-label`.
- Home covering links have reporter-profile labels.
- Globe is `role="img"` with sr-only text (not keyboard-equivalent to every marker).
- Lint: `<a>` instead of `Link` in investigation select field.
- Nested controls: Explore video link vs overlay buttons is structured to avoid `<a><button>`.
- Full WCAG: **not** assessed.

---

## 21. Production infrastructure

| Item | In repo / known |
|---|---|
| Hosting | **No** |
| Custom domain / HTTPS | **No** (would come from host) |
| Production env vars | **Not committed** (correct); **not verified** |
| Supabase production | Migrations exist; **apply/verify out of band** |
| Cloudflare production | Env only |
| Auth Site URL / Redirect URLs / emails | **Dashboard only** |
| Password reset | Callback only |
| Error monitoring | **No** |
| Product analytics | **No** |
| Backups | Supabase default unknown; **not documented here** |
| Deploy / staging / CI | **No** |
| robots/indexing | **No** `robots.txt` |
| Rate limiting / abuse | **No** app-level (rely on Supabase/Cloudflare/Nominatim) |
| Invite gate | **No** |

---

## 22. Automated test coverage

### This audit run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx eslint .` | **FAIL** — 3 errors, 4 warnings (see below) |
| `npx next build` | **PASS** |
| `node scripts/test-live-grid-invariants.mjs` | **PASS** |
| `node scripts/test-discovery-map.mjs` | **PASS** |
| `npx tsx scripts/test-*.ts` (your-world, location-live, follows, investigations, notifications, profile, search, live-moderation, media-provenance) | **PASS** (with unrestricted permissions) |
| `npx playwright test` | **FAIL this session** — Chromium executable missing from Playwright cache |

Lint errors: unused `searching`; `@next/next/no-html-link-for-pages` in investigation select; `setState` in effect in `use-location-live-session.ts`.

### Inventory

| Test | Kind | Protects |
|---|---|---|
| `e2e/home-live-grid.spec.ts` | E2E | Home 5-across, width, stream → `/u/` |
| `e2e/stream-navigation.spec.ts` | E2E | Home/Explore reporter vs investigation; arrows/X |
| `e2e/explore-arrows.spec.ts` | E2E | Arrow size, popup ≤280, no globe move |
| `e2e/coverage-map.spec.ts` | E2E | One world |
| `scripts/test-live-grid-invariants.mjs` | UNIT (source) | Grid CSS + required LivePreview variant |
| `scripts/test-discovery-map.mjs` | UNIT | Map wrap |
| `scripts/test-location-live.ts` | UNIT | Explore matching/order (showcase data) |
| `scripts/test-your-world.ts` | UNIT | Following feed |
| `scripts/test-follows.ts` | UNIT | Follow graph |
| `scripts/test-investigations.ts` | UNIT | Investigation assembly |
| `scripts/test-notifications.ts` | UNIT | Planner only |
| `scripts/test-profile.ts` | UNIT | Profile completeness |
| `scripts/test-search.ts` | UNIT | Search |
| `scripts/test-live-moderation.ts` | UNIT | Mock live moderation |
| `scripts/test-media-provenance.ts` | UNIT | Provenance fields |

**Not covered:** signup/login, coverage request create, Report on this, upload, publish, notification delivery, RLS, real Cloudflare, real Storage.

**AUTOMATED CRITICAL-PATH COVERAGE: FAIL** (discovery UI is protected; the reporting loop is not).

---

## 23. P0 blockers

1. **Production without Supabase env = mock product** (`isMockMode()`), including demo login.
2. **Photo (and non-CF video) local fallback can mask Storage/Cloudflare failure** and publish undeliverable media.
3. **Livestream without Cloudflare still creates “live” rows with `mock:local`** — not a real broadcast.
4. **Production Auth Site URL, Redirect URLs, and email templates are not in the repo and were not verified.** Real signup/login/email confirm will fail until they are set for the beta origin.

---

## 24. P1 before beta

1. Execute `docs/pre-beta-manual-checklist.md` on the **actual beta origin** with two real inboxes (this audit did not).
2. Confirm Cloudflare Stream **and** Live **and** Storage on that origin; **disable or fail loud** instead of local/mock success.
3. Create at least one **admin** profile; watch `/admin/moderation`.
4. **Close or constrain signup** (Supabase disable / invite-only) — the app has no allowlist.
5. Password reset **request UI** (callback already accepts recovery).
6. Stop swallowing notification emit errors (or alert the reporter that notify failed).
7. ESLint currently **fails** (3 errors).
8. Playwright + Chromium in CI; re-run e2e on the beta URL.
9. Nominatim usage/rate-limit plan (User-Agent, caching already 1h).
10. No product analytics — accept qualitative testing or add a minimal sink.
11. Device test: report upload + go-live on a phone.
12. Document backups and who can restore the Supabase project.

---

## 25. P2 after first beta

- Investigation follow notifications  
- Dedicated settings page  
- Account ban/block UX  
- Tighten `report_media` table GRANTs  
- Error monitoring (Sentry or equivalent)  
- Staging environment  
- `robots.txt` / noindex for invite  
- App-level rate limits  
- Events/licensing polish  
- Full WCAG pass  
- Keyboard-complete globe  

---

## 26. Recommended execution order

1. Point a **single beta origin** at a **single Supabase project**; set Auth URLs; apply **all 18 migrations**.  
2. Set Cloudflare keys; **prove** one photo via Storage and one live via WHIP (not showcase).  
3. **Fail** uploads/live if those providers are down (remove silent local/mock success for production).  
4. Two-person run of `docs/pre-beta-manual-checklist.md`.  
5. Seed admin; constrain signup.  
6. Password reset UI.  
7. Fix lint; put `tsc` + script tests + Playwright in CI.  
8. Only then invite 10–20 people.

---

## Appendix — TODOs / stubs / mock-only

- **No `TODO`/`FIXME` comments** found in `ts/tsx/js/sql`.  
- **Stubs:** `recordInvestigationEvent` no-op.  
- **Mock-only when unconfigured:** entire `lib/data/mock/*` path, mock auth, mock live WHIP.  
- **Dev-only presentation:** homepage / explore / wanted / following / investigation / reporter showcase.  
- **Dead routes:** none identified among compiled pages.

---

## PRE-BETA VERDICT

**CORE LOOP:** PARTIAL  
**SECURITY:** PARTIAL  
**REAL MEDIA:** PARTIAL  
**REAL LIVESTREAM:** PARTIAL  
**AUTH:** PARTIAL  
**PRODUCTION INFRASTRUCTURE:** FAIL  
**AUTOMATED CRITICAL-PATH COVERAGE:** FAIL  

**NUMBER OF P0 BLOCKERS:** 4  
**NUMBER OF P1 ITEMS:** 12  

**READY FOR 10–20 PERSON INVITE-ONLY BETA:** **NO**
