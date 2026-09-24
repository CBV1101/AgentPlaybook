# Pre-beta manual checklist — core loop

Use two browsers (or one normal window and one private window). Do not use mock accounts. Do not seed the database. Confirm against the linked Supabase project.

## Before you start

1. Dev server is this repo (`npm run dev`). Note the origin (likely `http://localhost:3001`).
2. In the Supabase dashboard for this project:
   - Authentication → URL configuration: Site URL is that origin.
   - Redirect URLs include `{origin}/auth/callback`.
   - Confirmations are enabled (or you will skip the inbox step if they are disabled).
3. Two real inboxes you can open.
4. If the homepage shows a “Development showcase” banner, ignore those cards for this test. Use **Coverage wanted** (`/wanted`) for discovery until a real request exists.

## Session A — requester

1. Sign up at `/signup` with a real email and a password of at least 6 characters.
2. You should see `/profile` with a check-email notice if confirmation is on.
3. Open the confirmation link **in Session A**. You should land on profile setup, signed in.
4. If you are not signed in, log in at `/login`. Failed confirmation should show an error, not a silent homepage.
5. Complete the reporter profile: username, display name, home city, home country. Save.
6. Go to **Request coverage** (`/requests/new`).
7. Enter a real question, search a real place, **choose a result**, submit. The button should show “Publishing request…”.
8. You should land on `/requests/{id}` and see the question and map.

Keep Session A logged in.

## Session B — reporter

9. Sign up, confirm email, complete a different reporter profile.
10. Open **Coverage wanted** (`/wanted`). Find Session A’s request (search if needed). Open it.
11. Click **I want this covered too**. The page should show “You want this covered”.
12. Click **Report on this**.
13. Title, what you saw, captured time, licensing, both checkboxes. Attach at least one photo you captured (a short phone video also works; without Cloudflare it stores locally on this machine).
14. Submit. Wait until it finishes (upload progress, then the report page). You should see the published report, not a draft notice.

## Session A — response

15. Open the bell / `/notifications`. There should be an unread item that Session B answered your request.
16. Open it. You should land on the published report.

## Public / other

17. Logged-out window: open the same report URL. It should load. It should also appear on `/wanted` under that request and on Latest firsthand once the homepage is using real data (showcase banner gone).
18. Drafts never appear in those public lists. Logged-out users must not open another reporter’s unpublished draft (404).
19. Session A must not be able to edit Session B’s report. Session B remains the reporter on the byline.

## If a step fails

Write down the URL, who was signed in, and the on-screen error. Do not insert rows in the dashboard to “make it pass.”
