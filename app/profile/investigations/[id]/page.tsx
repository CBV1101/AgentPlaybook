import Link from "next/link";
import { notFound } from "next/navigation";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { InvestigationPartsEditor } from "@/components/investigation-parts-editor";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice, Page } from "@/components/ui/page";
import { addInvestigationPart, deleteInvestigation, updateInvestigation } from "@/lib/investigation-actions";
import { getOwnedInvestigation, listEligibleInvestigationContent } from "@/lib/data";
import { requireCompleteReporterProfile } from "@/lib/require-profile";

type ManageInvestigationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ManageInvestigationPage({ params, searchParams }: ManageInvestigationPageProps) {
  const { profile } = await requireCompleteReporterProfile("/profile/investigations");
  const { id } = await params;
  const { error } = await searchParams;
  let page;
  try {
    page = await getOwnedInvestigation(profile.id, id);
  } catch {
    notFound();
  }
  const eligible = await listEligibleInvestigationContent(profile.id);
  const { investigation, parts } = page;

  return (
    <Page width="narrow">
      <p className="fh-kicker">
        <Link href="/profile/investigations" className="underline">
          Investigations
        </Link>
      </p>
      <h1 className="mt-2 fh-title">{investigation.title}</h1>
      <p className="mt-2 fh-meta">
        Public URL:{" "}
        <Link href={investigation.href} className="underline">
          {investigation.href}
        </Link>
      </p>
      <Notice>
        Removing this investigation does not delete the underlying reports. Firsthand does not verify
        conclusions.
      </Notice>
      {error ? <ErrorState>{error}</ErrorState> : null}

      <form action={updateInvestigation} className="mt-6 space-y-5">
        <input type="hidden" name="investigation_id" value={investigation.id} />
        <Field label="Title" htmlFor="title">
          <TextInput id="title" name="title" required maxLength={200} defaultValue={investigation.title} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" rows={5} defaultValue={investigation.description ?? ""} />
        </Field>
        <GeocodedLocationField />
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={investigation.status}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Button type="submit">Save</Button>
      </form>

      <section className="mt-12">
        <h2 className="fh-section">Parts</h2>
        <p className="mt-2 fh-meta">You control story order. It is not based on upload date.</p>
        {parts.length === 0 ? (
          <p className="mt-4 fh-meta">Add reporting to start the sequence.</p>
        ) : (
          <div className="mt-4">
            <InvestigationPartsEditor investigationId={investigation.id} parts={parts} />
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="fh-section">Add reporting</h2>
        <form action={addInvestigationPart} className="mt-4 space-y-4">
          <input type="hidden" name="investigation_id" value={investigation.id} />
          <Field label="Existing report" htmlFor="report_id">
            <Select id="report_id" name="report_id" defaultValue="">
              <option value="">Choose a report</option>
              {eligible.reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Livestream or recording" htmlFor="live_stream_id">
            <Select id="live_stream_id" name="live_stream_id" defaultValue="">
              <option value="">Choose a livestream</option>
              {eligible.liveStreams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.status === "live" ? "LIVE · " : ""}
                  {stream.title}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Add to investigation</Button>
        </form>
      </section>

      <form action={deleteInvestigation} className="mt-16">
        <input type="hidden" name="investigation_id" value={investigation.id} />
        <Button type="submit" variant="danger">
          Delete investigation
        </Button>
        <p className="mt-2 fh-meta">Reports and livestreams stay in your library.</p>
      </form>
    </Page>
  );
}
