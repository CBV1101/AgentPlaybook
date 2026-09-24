import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState, Notice, Page, Section } from "@/components/ui/page";
import {
  dismissModerationReport,
  markModerationReviewed,
  removeReportedContentAction,
  setLivePrivilegeAction,
  terminateLivestreamAction,
} from "@/lib/moderation-actions";
import { listModerationReports } from "@/lib/queries";
import { liveStatusLabel } from "@/lib/live";
import { moderationReasonLabel } from "@/lib/moderation";
import { requireAdmin } from "@/lib/require-admin";

type AdminModerationPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const noticeCopy: Record<string, string> = {
  dismissed: "That report was dismissed.",
  reviewed: "Marked as reviewed.",
  removed: "The content was removed from public view.",
  terminated: "The livestream was terminated. It is no longer shown as live.",
  "live-disabled": "Live streaming was disabled for that reporter.",
  "live-enabled": "Live streaming was enabled for that reporter.",
};

export default async function AdminModerationPage({ searchParams }: AdminModerationPageProps) {
  await requireAdmin();
  const { notice } = await searchParams;
  const items = await listModerationReports();
  const openItems = items.filter((item) => item.status === "open");
  const otherItems = items.filter((item) => item.status !== "open");

  return (
    <Page>
      <p className="fh-kicker">Admin</p>
      <h1 className="mt-3 fh-hero">Moderation</h1>
      <p className="mt-3 max-w-2xl fh-lede">
        Human review only. Live streams can be harmful in real time; terminate a broadcast without
        deleting the record. There is no automated or AI moderation.
      </p>

      {notice && noticeCopy[notice] ? <Notice tone="ok">{noticeCopy[notice]}</Notice> : null}

      <QueueSection title="Open reports" items={openItems} empty="No open reports." />
      <QueueSection title="Closed reports" items={otherItems} empty="No reviewed, dismissed, or removed reports yet." />
    </Page>
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
    <Section title={title}>
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul className="mt-4">
          {items.map((item) => (
            <li key={item.id} className="fh-list-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="fh-label">{item.status}</p>
                  <p className="mt-1 fh-report-title">{item.contentTitle}</p>
                  <p className="mt-1 fh-meta">
                    {item.contentType === "coverage_request"
                      ? "Coverage request"
                      : item.contentType === "live_stream"
                        ? "Livestream"
                        : "Firsthand report"}{" "}
                    · {moderationReasonLabel(item.reason)} · reported by @{item.submittedByUsername}
                  </p>
                  {item.liveStream ? (
                    <dl className="mt-3 grid gap-1 fh-meta">
                      <div>
                        Reporter{" "}
                        <Link href={`/u/${item.liveStream.reporterUsername}`} className="underline">
                          {item.liveStream.reporterName}
                        </Link>
                      </div>
                      <div>Stream title {item.contentTitle}</div>
                      <div>Location {item.liveStream.locationLabel}</div>
                      {item.liveStream.eventTitle ? <div>Event {item.liveStream.eventTitle}</div> : null}
                      <div>Current stream status {liveStatusLabel(item.liveStream.streamStatus)}</div>
                      <div>
                        Number of reports received {item.liveStream.reportCount}
                      </div>
                    </dl>
                  ) : null}
                  {item.details ? <p className="mt-2 fh-body">{item.details}</p> : null}
                  {item.contentRemoved ? (
                    <p className="mt-2 text-sm text-danger">
                      {item.contentType === "live_stream"
                        ? "This livestream is already terminated."
                        : "This content is already removed from public view."}
                    </p>
                  ) : null}
                </div>
                <Link href={item.contentHref} className={buttonClass("secondary")}>
                  Open content
                </Link>
              </div>

              {item.status === "open" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.contentType !== "live_stream" ? (
                    <form action={markModerationReviewed}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="secondary">
                        Mark reviewed
                      </Button>
                    </form>
                  ) : null}
                  <form action={dismissModerationReport}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" variant="secondary">
                      Dismiss report
                    </Button>
                  </form>
                  {item.contentType === "live_stream" ? (
                    <>
                      <form action={terminateLivestreamAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" variant="danger">
                          Terminate livestream
                        </Button>
                      </form>
                      {item.liveStream ? (
                        <form action={setLivePrivilegeAction}>
                          <input type="hidden" name="reporter_id" value={item.liveStream.reporterId} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={item.liveStream.reporterCanLiveStream ? "false" : "true"}
                          />
                          <Button type="submit" variant="secondary">
                            {item.liveStream.reporterCanLiveStream
                              ? "Disable live streaming for reporter"
                              : "Enable live streaming for reporter"}
                          </Button>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <form action={removeReportedContentAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="danger">
                        Remove content
                      </Button>
                    </form>
                  )}
                </div>
              ) : item.contentType === "live_stream" && item.liveStream ? (
                <div className="mt-4">
                  <form action={setLivePrivilegeAction}>
                    <input type="hidden" name="reporter_id" value={item.liveStream.reporterId} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={item.liveStream.reporterCanLiveStream ? "false" : "true"}
                    />
                    <Button type="submit" variant="secondary">
                      {item.liveStream.reporterCanLiveStream
                        ? "Disable live streaming for reporter"
                        : "Enable live streaming for reporter"}
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
