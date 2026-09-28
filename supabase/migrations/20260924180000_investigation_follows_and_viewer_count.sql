-- Follow investigations using the same follow-row pattern as reporters and places.
-- Viewer count is an optional cache of Cloudflare's current live audience, never invented.

create table public.investigation_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint investigation_follows_unique unique (user_id, investigation_id)
);

create index investigation_follows_user_id_idx on public.investigation_follows (user_id);
create index investigation_follows_investigation_id_idx on public.investigation_follows (investigation_id);

comment on table public.investigation_follows is
  'Who follows a published investigation. Same explicit-follow model as profile_follows and location_follows.';

alter table public.investigation_follows enable row level security;
alter table public.investigation_follows force row level security;

create policy "Investigation follows are publicly readable"
  on public.investigation_follows for select to anon, authenticated using (true);
create policy "Users follow investigations themselves"
  on public.investigation_follows for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users unfollow investigations themselves"
  on public.investigation_follows for delete to authenticated
  using (user_id = auth.uid());

grant select on table public.investigation_follows to anon, authenticated;
grant insert (id, user_id, investigation_id) on table public.investigation_follows to authenticated;
grant delete on table public.investigation_follows to authenticated;

alter table public.live_streams
  add column if not exists viewer_count integer,
  add column if not exists viewer_count_checked_at timestamptz;

comment on column public.live_streams.viewer_count is
  'Cached current live audience from Cloudflare when available. Null means unknown, not zero.';
comment on column public.live_streams.viewer_count_checked_at is
  'When viewer_count was last read from Cloudflare. Used to avoid reordering Explore browsers every second.';
