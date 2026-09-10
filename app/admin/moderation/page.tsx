import Link from "next/link";
import { dismissModerationReport, markModerationReviewed, removeReportedContentAction } from "@/lib/moderation-actions";
import { listModerationReports } from "@/lib/queries";
import { moderationReasonLabel } from "@/lib/moderation";
import { requireAdmin } from "@/lib/require-admin";

type AdminModerationPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const noticeCopy: Record<string, string> = {
  dismissed: "That report was dismissed.",
  reviewed: "Marked as reviewed.",
  removed: "The content was removed from public view.",
};

export default async function AdminModerationPage({ searchParams }: AdminModerationPageProps) {
  await requireAdmin();
  const { notice } = await searchParams;
  const items = await listModerationReports();
  const openItems = items.filter((item) => item.status === "open");
  const otherItems = items.filter((item) => item.status !== "open");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Admin</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-950">
        Moderation
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Human review only. Open a piece of content, dismiss a report, or remove it from public view.
      </p>

      {notice && noticeCopy[notice] ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{noticeCopy[notice]}</p>
      ) : null}

      <QueueSection title="Open reports" items={openItems} empty="No open reports." />
      <QueueSection title="Closed reports" items={otherItems} empty="No reviewed, dismissed, or removed reports yet." />
    </main>
  );
}

function QueueSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listModerationReports>>;
  empty: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-stone-600">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{item.status}</p>
                  <p className="mt-1 text-lg font-medium text-stone-900">{item.contentTitle}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {item.contentType === "coverage_request" ? "Coverage request" : "Firsthand report"} ·{" "}
                    {moderationReasonLabel(item.reason)} · reported by @{item.submittedByUsername}
                  </p>
                  {item.details ? <p className="mt-2 text-sm text-stone-700">{item.details}</p> : null}
                  {item.contentRemoved ? (
                    <p className="mt-2 text-sm text-rose-800">This content is already removed from public view.</p>
                  ) : null}
                </div>
                <Link
                  href={item.contentHref}
                  className="inline-flex min-h-10 items-center rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                >
                  Open content
                </Link>
              </div>

              {item.status === "open" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={markModerationReviewed}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="min-h-10 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                      Mark reviewed
                    </button>
                  </form>
                  <form action={dismissModerationReport}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="min-h-10 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                      Dismiss
                    </button>
                  </form>
                  <form action={removeReportedContentAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="min-h-10 rounded-full bg-rose-800 px-3 py-1.5 text-sm font-medium text-rose-50 hover:bg-rose-700"
                    >
                      Remove content
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
