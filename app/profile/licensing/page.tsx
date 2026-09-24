import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { EmptyState, ErrorState, Page } from "@/components/ui/page";
import { setLicensingInquiryStatus } from "@/lib/licensing-actions";
import { intendedUseLabel, inquiryStatusLabel, LICENSING_INQUIRY_STATUSES } from "@/lib/licensing";
import { listLicensingInbox } from "@/lib/queries";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

type LicensingInboxPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LicensingInboxPage({ searchParams }: LicensingInboxPageProps) {
  const user = await requireUser("/profile/licensing");
  const { error } = await searchParams;
  const inquiries = await listLicensingInbox(user.id);

  return (
    <Page width="article">
      <p className="fh-kicker">Licensing</p>
      <h1 className="mt-3 fh-hero">Licensing inquiries</h1>
      <p className="mt-3 max-w-2xl fh-lede">
        These are requests to license original media from your reports. Changing status does not
        process a payment or automatically grant rights. The creator must still agree to terms
        outside this form.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/profile" className="underline">
          Account settings
        </Link>
      </p>
      {error ? <ErrorState>{error}</ErrorState> : null}

      {inquiries.length === 0 ? (
        <EmptyState title="No licensing inquiries yet." />
      ) : (
        <ul className="mt-8">
          {inquiries.map((item) => (
            <li key={item.id} className="fh-list-row">
              <p className="fh-label">
                {inquiryStatusLabel(item.status)} · {formatWhen(item.createdAt)}
              </p>
              <h2 className="mt-2 fh-section">
                <Link href={`/reports/${item.reportId}`} className="underline">
                  {item.reportTitle}
                </Link>
              </h2>
              <dl className="mt-3 grid gap-2 text-sm text-muted">
                <div>
                  <dt className="fh-label">Media</dt>
                  <dd>{item.mediaLabel}</dd>
                </div>
                <div>
                  <dt className="fh-label">Requester</dt>
                  <dd>
                    {item.organizationName}
                    {item.contactEmail ? ` · ${item.contactEmail}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="fh-label">Intended use</dt>
                  <dd>{intendedUseLabel(item.intendedUse)}</dd>
                </div>
                {item.message ? (
                  <div>
                    <dt className="fh-label">Message</dt>
                    <dd className="whitespace-pre-wrap">{item.message}</dd>
                  </div>
                ) : null}
              </dl>
              <form action={setLicensingInquiryStatus} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="inquiry_id" value={item.id} />
                <Field label="Status" htmlFor={`status-${item.id}`}>
                  <Select id={`status-${item.id}`} name="status" defaultValue={item.status}>
                    {LICENSING_INQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {inquiryStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="secondary">
                  Update
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
