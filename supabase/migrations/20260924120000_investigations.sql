-- Investigations / reporting series: organizational layer over existing reports
-- and livestreams. Does not replace reports, media, or live infrastructure.
-- Deleting an investigation does not delete underlying reports.

create type public.investigation_status as enum ('draft', 'published', 'archived');

create table public.investigations (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  slug text not null,
  description text,
  cover_media_id uuid references public.report_media (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  status public.investigation_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  removed_at timestamptz,
  constraint investigations_title_length check (char_length(title) between 1 and 200),
  constraint investigations_slug_format check (slug ~ '^[a-z0-9-]{1,120}$'),
  constraint investigations_description_length check (
    description is null or char_length(description) <= 20000
  )
);

comment on table public.investigations is
  'Reporter-defined multi-part reporting series. Groups existing reports and livestreams. Grouping does not mean Firsthand verified the reporter''s conclusions.';
comment on column public.investigations.location_id is
  'Optional primary/contextual location. Individual report locations remain provenance.';
comment on column public.investigations.status is
  'draft: owner only; published: public if not removed; archived: unpublished by owner.';
comment on column public.investigations.removed_at is
  'Moderation removal. Does not delete member reports.';

create unique index investigations_reporter_slug_key on public.investigations (reporter_id, slug);
create index investigations_reporter_id_idx on public.investigations (reporter_id);
create index investigations_status_updated_idx
  on public.investigations (status, updated_at desc)
  where removed_at is null;
create index investigations_location_id_idx on public.investigations (location_id);

create table public.investigation_items (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  live_stream_id uuid references public.live_streams (id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  constraint investigation_items_position_positive check (position >= 1),
  constraint investigation_items_has_content check (
    report_id is not null or live_stream_id is not null
  )
);

comment on table public.investigation_items is
  'Ordered parts of an investigation. position is reporter-controlled story order, not created_at. live_stream_id holds a live part until a recording report exists; then report_id is set without changing position.';

create unique index investigation_items_position_key
  on public.investigation_items (investigation_id, position);
create unique index investigation_items_report_key
  on public.investigation_items (report_id)
  where report_id is not null;
create unique index investigation_items_live_key
  on public.investigation_items (live_stream_id)
  where live_stream_id is not null;
create index investigation_items_investigation_id_idx
  on public.investigation_items (investigation_id);

create or replace function public.touch_investigation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger investigations_touch_updated_at
  before update on public.investigations
  for each row
  execute procedure public.touch_investigation_updated_at();

create or replace function public.touch_investigation_from_item()
returns trigger
language plpgsql
as $$
declare
  target uuid;
begin
  target := coalesce(new.investigation_id, old.investigation_id);
  update public.investigations
    set updated_at = now()
    where id = target;
  return coalesce(new, old);
end;
$$;

create trigger investigation_items_touch_parent
  after insert or update or delete on public.investigation_items
  for each row
  execute procedure public.touch_investigation_from_item();

create or replace function public.enforce_investigation_item_ownership()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
  report_owner uuid;
  live_owner uuid;
begin
  select reporter_id into owner
  from public.investigations
  where id = new.investigation_id;

  if owner is null then
    raise exception 'investigation not found';
  end if;

  if new.report_id is not null then
    select created_by into report_owner
    from public.reports
    where id = new.report_id;
    if report_owner is null or report_owner <> owner then
      raise exception 'investigation items may only include the reporter''s own reports';
    end if;
  end if;

  if new.live_stream_id is not null then
    select reporter_id into live_owner
    from public.live_streams
    where id = new.live_stream_id;
    if live_owner is null or live_owner <> owner then
      raise exception 'investigation items may only include the reporter''s own livestreams';
    end if;
  end if;

  return new;
end;
$$;

create trigger investigation_items_ownership
  before insert or update of investigation_id, report_id, live_stream_id
  on public.investigation_items
  for each row
  execute procedure public.enforce_investigation_item_ownership();

alter table public.investigations enable row level security;
alter table public.investigation_items enable row level security;
alter table public.investigations force row level security;
alter table public.investigation_items force row level security;

revoke all on table public.investigations from public;
revoke all on table public.investigation_items from public;

create policy "Published investigations are publicly readable"
  on public.investigations
  for select
  to anon, authenticated
  using (
    (status = 'published' and removed_at is null)
    or reporter_id = auth.uid()
    or public.is_admin()
  );

create policy "Reporters create their investigations"
  on public.investigations
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Owners update their investigations"
  on public.investigations
  for update
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin())
  with check (reporter_id = auth.uid() or public.is_admin());

create policy "Owners delete their investigations"
  on public.investigations
  for delete
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "Investigation items follow parent visibility"
  on public.investigation_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.investigations i
      where i.id = investigation_items.investigation_id
        and (
          (i.status = 'published' and i.removed_at is null)
          or i.reporter_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy "Owners add investigation items"
  on public.investigation_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.investigations i
      where i.id = investigation_items.investigation_id
        and i.reporter_id = auth.uid()
    )
  );

create policy "Owners update investigation items"
  on public.investigation_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.investigations i
      where i.id = investigation_items.investigation_id
        and (i.reporter_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.investigations i
      where i.id = investigation_items.investigation_id
        and (i.reporter_id = auth.uid() or public.is_admin())
    )
  );

create policy "Owners delete investigation items"
  on public.investigation_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.investigations i
      where i.id = investigation_items.investigation_id
        and (i.reporter_id = auth.uid() or public.is_admin())
    )
  );

grant usage on type public.investigation_status to anon, authenticated;

grant select on table public.investigations to anon, authenticated;
grant insert (
  id,
  reporter_id,
  title,
  slug,
  description,
  cover_media_id,
  location_id,
  status,
  published_at
) on table public.investigations to authenticated;
grant update (
  title,
  slug,
  description,
  cover_media_id,
  location_id,
  status,
  published_at,
  removed_at
) on table public.investigations to authenticated;
grant delete on table public.investigations to authenticated;

grant select on table public.investigation_items to anon, authenticated;
grant insert (
  id,
  investigation_id,
  report_id,
  live_stream_id,
  position
) on table public.investigation_items to authenticated;
grant update (
  report_id,
  live_stream_id,
  position
) on table public.investigation_items to authenticated;
grant delete on table public.investigation_items to authenticated;

alter type public.moderation_content_type add value if not exists 'investigation';
