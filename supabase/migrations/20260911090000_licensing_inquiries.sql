-- Licensing inquiries: contact fields and reporter-facing statuses.
-- Payments are not processed. Future Stripe Connect belongs in application
-- services, not extra columns on this table.

alter type public.licensing_transaction_status add value if not exists 'discussing';
alter type public.licensing_transaction_status add value if not exists 'agreed';
alter type public.licensing_transaction_status add value if not exists 'declined';

alter table public.licensing_transactions
  add column if not exists reporter_id uuid references public.profiles (id) on delete restrict,
  add column if not exists organization_name text,
  add column if not exists contact_email text,
  add column if not exists intended_use text,
  add column if not exists message text;

update public.licensing_transactions as inquiry
set reporter_id = reports.created_by
from public.reports
where reports.id = inquiry.report_id
  and inquiry.reporter_id is null;

comment on column public.licensing_transactions.organization_name is
  'Name of the person or organization requesting a license. Not a payment record.';
comment on column public.licensing_transactions.intended_use is
  'Declared intended use. Agreement still requires the creator; this is not a grant of rights.';

drop policy if exists "Licensing transactions are publicly readable" on public.licensing_transactions;

create policy "Reporter or licensee can read licensing inquiries"
  on public.licensing_transactions for select to authenticated
  using (reporter_id = auth.uid() or licensee_profile_id = auth.uid());

create policy "Licensees submit their own inquiries"
  on public.licensing_transactions for insert to authenticated
  with check (
    licensee_profile_id = auth.uid()
    and reporter_id <> auth.uid()
    and exists (
      select 1
      from public.reports
      where reports.id = report_id
        and reports.created_by = reporter_id
        and reports.licensing_status = 'licensing_available'
        and reports.removed_at is null
    )
  );

create policy "Reporters update inquiry status"
  on public.licensing_transactions for update to authenticated
  using (reporter_id = auth.uid())
  with check (reporter_id = auth.uid());

grant insert (
  id,
  report_id,
  report_media_id,
  licensee_profile_id,
  reporter_id,
  status,
  organization_name,
  contact_email,
  intended_use,
  message
) on table public.licensing_transactions to authenticated;

grant update (status) on table public.licensing_transactions to authenticated;
