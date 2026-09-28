import { ReportForm } from "@/components/report-form";
import { Page } from "@/components/ui/page";
import { requireCompleteReporterProfile } from "@/lib/require-profile";
import { getRequestComposeContext, listInvestigationOptions } from "@/lib/queries";
import { notFound } from "next/navigation";

type NewReportPageProps = {
  searchParams: Promise<{ requestId?: string; error?: string }>;
};

export default async function NewReportPage({ searchParams }: NewReportPageProps) {
  const { requestId, error } = await searchParams;
  const nextPath = requestId ? `/reports/new?requestId=${requestId}` : "/reports/new";
  const { profile } = await requireCompleteReporterProfile(nextPath);
  const investigations = await listInvestigationOptions(profile.id);

  let requestTitle: string | undefined;
  let locationId = "";
  let locationLabel = "";
  let eventId: string | null = null;

  if (requestId) {
    const context = await getRequestComposeContext(requestId);
    if (!context) {
      notFound();
    }
    requestTitle = context.title;
    locationId = context.locationId;
    locationLabel = context.locationLabel;
    eventId = context.eventId ?? null;
  }

  const responding = Boolean(requestId);

  return (
    <Page width="narrow">
      <h1 className="fh-title">
        {responding ? "Report on this" : "Publish firsthand report"}
      </h1>
      <p className="mt-2 fh-lede">
        Publish a firsthand account with photos or video you captured yourself. Firsthand does not
        determine whether this report is true.
      </p>

      <div className="mt-8">
        <ReportForm
          mode={responding ? "response" : "independent"}
          requestId={requestId}
          requestTitle={requestTitle}
          locationId={locationId || undefined}
          locationLabel={locationLabel || undefined}
          eventId={eventId}
          error={error}
          investigations={investigations}
        />
      </div>
    </Page>
  );
}
