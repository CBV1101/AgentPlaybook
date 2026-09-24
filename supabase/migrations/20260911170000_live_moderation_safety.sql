-- Human live-stream safety: privileges, sensitive-content flags, and admin controls.
-- No automated or AI moderation.
-- Safe to re-run: columns use IF NOT EXISTS; functions are CREATE OR REPLACE;
-- triggers and policies are dropped before recreate; GRANT is additive.

alter table public.profiles
  add column if not exists can_live_stream boolean not null default true;

comment on column public.profiles.can_live_stream is
  'When false, the reporter cannot start a live broadcast. Not a full account suspension.';

alter table public.live_streams
  add column if not exists sensitive_content boolean not null default false;

alter table public.reports
  add column if not exists sensitive_content boolean not null default false;

comment on column public.live_streams.sensitive_content is
  'Admin-set flag. Viewers must confirm before seeing the stream. Not an accuracy or truth label.';
comment on column public.reports.sensitive_content is
  'Admin-set flag. Viewers must confirm before seeing media. Not an accuracy or truth label.';

create or replace function public.enforce_admin_only_live_privilege()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.can_live_stream is distinct from old.can_live_stream and not public.is_admin() then
    raise exception 'only admins can change live streaming privileges';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_admin_only_live_privilege on public.profiles;
create trigger profiles_admin_only_live_privilege
  before update of can_live_stream on public.profiles
  for each row
  execute procedure public.enforce_admin_only_live_privilege();

create or replace function public.enforce_admin_only_sensitive_live()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sensitive_content is distinct from old.sensitive_content and not public.is_admin() then
    raise exception 'only admins can change the sensitive content flag';
  end if;
  return new;
end;
$$;

drop trigger if exists live_streams_admin_only_sensitive on public.live_streams;
create trigger live_streams_admin_only_sensitive
  before update of sensitive_content on public.live_streams
  for each row
  execute procedure public.enforce_admin_only_sensitive_live();

create or replace function public.enforce_admin_only_sensitive_report()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sensitive_content is distinct from old.sensitive_content and not public.is_admin() then
    raise exception 'only admins can change the sensitive content flag';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_admin_only_sensitive on public.reports;
create trigger reports_admin_only_sensitive
  before update of sensitive_content on public.reports
  for each row
  execute procedure public.enforce_admin_only_sensitive_report();

drop policy if exists "Admins update reporter live privileges" on public.profiles;
create policy "Admins update reporter live privileges"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins update reports for moderation" on public.reports;
create policy "Admins update reports for moderation"
  on public.reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update (can_live_stream) on table public.profiles to authenticated;
grant update (sensitive_content) on table public.live_streams to authenticated;
grant update (sensitive_content) on table public.reports to authenticated;
