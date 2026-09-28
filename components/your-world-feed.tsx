import Link from "next/link";
import { FeedMedia } from "@/components/feed-media";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { RelativeTime } from "@/components/relative-time";
import { cityHref } from "@/lib/geo";
import type { YourWorldItem } from "@/lib/your-world";

export function YourWorldFeed({
  items,
  hasMore,
  empty,
}: {
  items: YourWorldItem[];
  hasMore: boolean;
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="mt-5">
        <p className="fh-section">Your world starts with what you follow.</p>
        <p className="mt-2 fh-lede">
          Follow reporters, places and investigations to build your personal view of the world.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/browse" className="font-medium text-ink underline underline-offset-2">
            Explore places
          </Link>
          <Link href="/search" className="font-medium text-ink underline underline-offset-2">
            Discover reporters
          </Link>
          <Link href="/search" className="font-medium text-ink underline underline-offset-2">
            Ongoing investigations
          </Link>
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="mt-5 fh-meta">Nothing new from the parts of the world you follow yet.</p>;
  }

  const last = items[items.length - 1];

  return (
    <div className="mt-6">
      {items.map((item) => (
        <YourWorldEntry key={item.id} item={item} />
      ))}
      {hasMore && last ? (
        <p className="mt-6">
          <Link
            href={`/following?before=${encodeURIComponent(last.occurredAt)}`}
            className="text-sm font-medium text-ink underline underline-offset-2"
          >
            Earlier activity →
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function PlaceHeading({ city, country, href }: { city: string; country?: string | null; href: string }) {
  return (
    <p className="fh-place">
      <Link href={href} className="hover:underline">
        {city}
        {country ? `, ${country}` : ""}
      </Link>
    </p>
  );
}

function YourWorldEntry({ item }: { item: YourWorldItem }) {
  if (item.kind === "place-group") {
    return (
      <article className="border-t border-line py-8">
        <PlaceHeading city={item.city} country={item.country} href={item.locationHref} />
        <p className="mt-1 fh-meta">
          Place you follow · <RelativeTime value={item.occurredAt} className="inline fh-meta" />
        </p>
        <h3 className="mt-3 fh-report-title">{item.reports.length} new firsthand reports</h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {item.reports.slice(0, 3).map((report) => (
            <div key={report.id}>
              <FeedMedia report={report} />
              <p className="mt-1 fh-meta">
                <RelativeTime value={report.publishedAt} className="inline fh-meta" />
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3">
          <Link href={item.locationHref} className="text-sm font-medium text-ink underline underline-offset-2">
            See {item.city} →
          </Link>
        </p>
      </article>
    );
  }

  const report = item.report;
  const placeHref = report.locationHref ?? cityHref(report.city ?? "", report.country ?? "");
  const reporterHref = report.reporterUsername ? `/u/${report.reporterUsername}` : null;
  const reportHref = reporterHref ?? `/reports/${report.id}`;

  return (
    <article className="border-t border-line py-8">
      <PlaceHeading city={report.city ?? report.location} country={report.country} href={placeHref} />
      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted">
        {reporterHref ? (
          <Link href={reporterHref} className="flex min-w-0 items-center gap-2 hover:underline">
            <ReporterAvatar
              name={report.reporterName}
              username={report.reporterUsername ?? "reporter"}
              avatarUrl={report.reporterAvatarUrl}
              size="sm"
            />
            <span className="truncate">{report.reporterName}</span>
          </Link>
        ) : (
          <span>{report.reporterName}</span>
        )}
        <span aria-hidden>·</span>
        <RelativeTime value={item.occurredAt} className="inline fh-meta" />
      </div>
      <p className="mt-1 fh-meta">{item.reason}</p>
      {item.kind === "investigation" ? (
        <div className="mt-3">
          <h3 className="fh-report-title">
            <Link href={item.investigationHref} className="hover:underline">
              {item.investigationTitle}
            </Link>
          </h3>
          <p className="mt-1 fh-label">
            <Link href={`${item.investigationHref}#part-${item.position}`} className="hover:underline">
              Part {item.position}
            </Link>
          </p>
        </div>
      ) : (
        <h3 className="mt-3 fh-report-title">
          <Link href={reportHref} className="hover:underline">
            {report.title}
          </Link>
        </h3>
      )}
      <div className="mt-4">
        <FeedMedia report={report} href={reporterHref} />
      </div>
      <p className="mt-3 fh-body">{item.kind === "investigation" ? report.excerpt || report.title : report.excerpt}</p>
      {item.kind === "investigation" ? (
        <p className="mt-3">
          <Link href={item.investigationHref} className="text-sm font-medium text-ink underline underline-offset-2">
            Continue investigation →
          </Link>
        </p>
      ) : null}
    </article>
  );
}
