import { ReportForm } from "@/components/report-form";
import { requireUser } from "@/lib/require-user";
import { getRequestComposeContext } from "@/lib/queries";
import { notFound } from "next/navigation";

type NewReportPageProps = {
  searchParams: Promise<{ requestId?: string; error?: string }>;
};

export default async function NewReportPage({ searchParams }: NewReportPageProps) {
  const { requestId, error } = await searchParams;
  const nextPath = requestId ? `/reports/new?requestId=${requestId}` : "/reports/new";
  await requireUser(nextPath);

  let requestTitle: string | undefined;
  let locationId = "";
  let locationLabel = "";

  if (requestId) {
    const context = await getRequestComposeContext(requestId);
    if (!context) {
      notFound();
    }
    requestTitle = context.title;
    locationId = context.locationId;
    locationLabel = context.locationLabel;
  }

  const responding = Boolean(requestId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
        {responding ? "Report from this location" : "Publish firsthand report"}
      </h1>
      <p className="mt-2 text-stone-600">
        Publish a firsthand account with photos or video you captured yourself. Firsthand does not
        determine whether this report is true.
      </p>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <ReportForm
          mode={responding ? "response" : "independent"}
          requestId={requestId}
          requestTitle={requestTitle}
          locationId={locationId || undefined}
          locationLabel={locationLabel || undefined}
          error={error}
        />
      </div>
    </main>
  );
}
