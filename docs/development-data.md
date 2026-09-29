# Development mock and showcase data

Firsthand can use fictional data **only as an explicit development tool**. Production never falls back to mock or showcase content when Supabase is missing, empty, or failing.

## Two different development tools

| Tool | What it is | How to turn it on | Production |
| --- | --- | --- | --- |
| **Mock store** | Full local JSON database (`.local/mock-db.json`), demo login, local media paths | `FIRSTHAND_USE_MOCK=1` in `.env.local` **and** `NODE_ENV` is not `production` | Impossible. The flag is ignored. Missing Supabase env is a hard configuration error. |
| **Showcase presentation** | Fictional homepage / Explore / Coverage wanted / Following / investigation layouts used to design UI when a real project has little activity | `NODE_ENV === "development"` (`npm run dev`). Not tied to missing Supabase. | Impossible. `canUseShowcaseData()` is always false. |

Do **not** remove Supabase variables expecting the product to become a demo. That used to happen and is no longer allowed.

## Mock store (`FIRSTHAND_USE_MOCK`)

Use this when you want the on-disk mock repository instead of Supabase, including when `.env.local` also has real keys.

```bash
# .env.local
FIRSTHAND_USE_MOCK=1
```

Accepted values: `1`, `true`, `yes` (case-insensitive).

Then:

```bash
npm run dev
```

Expected:

- Banner: local mock data is on
- Persistence: `.local/mock-db.json`
- Demo login: `jordan@firsthand.local` / `firsthand`

In **production** (`NODE_ENV=production` / `next start` after `next build`):

- `FIRSTHAND_USE_MOCK` does nothing
- `getDataSource()` always returns `supabase`
- Missing or invalid `NEXT_PUBLIC_SUPABASE_URL` and public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) throw:

  `Firsthand production configuration error: … is required.`

  The error names variables only. It does not print secrets.

## Showcase (`npm run dev` + real or empty Supabase)

`npm run dev` sets `NODE_ENV=development`. Showcase modules (`lib/homepage-showcase.ts`, `lib/discovery-showcase.ts`, `lib/investigation-showcase.ts`) may fill **empty or sparse** presentation payloads so Home, Explore, Coverage wanted, Following, and investigations can be designed.

Rules:

- Showcase IDs use a `dev-showcase-` prefix and are never written to Supabase
- Home still prefers real live streams once there are at least six `live` streams
- An empty **production** database must render truthful empty states, not this content

Development with real Supabase and **without** `FIRSTHAND_USE_MOCK`:

- Repositories talk to Supabase
- Showcase may still overlay sparse presentation in development only

## Production invariants

```
production + valid Supabase URL/key  → supabase, no mock, no showcase
production + missing/invalid config  → throw (never mock)
production + empty database          → empty UI (never showcase)
production + Supabase request error  → error / empty from the real repository (never mock)
```

Selection lives in `lib/data/mode.ts` (`getDataSource`, `canUseShowcaseData`, `assertProductionSupabaseConfig`). Startup also asserts in `instrumentation.ts` and `app/layout.tsx`. API routes use `lib/data/index.ts`, which follows `getDataSource()` and does not catch failures into the mock store.

Regression tests: `npm run test:data-source`.

## Local media files

`/api/media/local-upload` and `.local/media` are part of **mock mode only**. Supabase mode never falls back to disk if Storage fails. Production rejects local media even if `FIRSTHAND_USE_MOCK` is set.

Published report photos in Supabase mode are stored in the private `report-images` bucket. The Next.js server signs short-lived GET URLs with `SUPABASE_SERVICE_ROLE_KEY`. That key must never be exposed as `NEXT_PUBLIC_*`. Reporter avatars use the public `reporter-avatars` bucket.
