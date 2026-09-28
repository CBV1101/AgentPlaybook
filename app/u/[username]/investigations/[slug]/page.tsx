import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { InvestigationTimeline } from "@/components/investigation-timeline";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { LocationLabel } from "@/components/ui/badge";
import { Notice, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { getInvestigationPage, isFollowingInvestigation } from "@/lib/data";
import { applyInvestigationShowcasePage } from "@/lib/investigation-showcase";
import { RelativeTime } from "@/components/relative-time";

type InvestigationPublicPageProps = {
  params: Promise<{ username: string; slug: string }>;
};

export default async function InvestigationPublicPage({ params }: InvestigationPublicPageProps) {
  const { username, slug } = await params;
  const user = await getCurrentUser();
  const real = await getInvestigationPage(username, slug, user?.id);
  const page = applyInvestigationShowcasePage(username, slug, real);

  if (!page) {
    notFound();
  }

  const following =
    user && !page.investigation.id.startsWith("dev-showcase-")
      ? await isFollowingInvestigation(user.id, page.investigation.id)
      : false;

  const { investigation, parts, firstPublic, latestPublic, livePart } = page;
  const showcase = investigation.id.startsWith("dev-showcase-");

  return (
    <Page width="article">
      {showcase ? (
        <Notice>
          Development showcase — fictional reporting for layout evaluation. Not stored in Supabase
          and never shown in production.
        </Notice>
      ) : null}
      <p className="fh-kicker">Investigation</p>
      <h1 className="mt-2 fh-title">{investigation.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={`/u/${investigation.reporterUsername}`} className="flex items-center gap-2 hover:underline">
          <ReporterAvatar
            name={investigation.reporterName}
            username={investigation.reporterUsername}
            size="sm"
          />
          <span className="text-sm font-medium text-ink">{investigation.reporterName}</span>
        </Link>
      </p>
      {showcase ? null : (
        <div className="mt-4">
          <FollowButton
            kind="investigation"
            investigationId={investigation.id}
            isAuthenticated={Boolean(user)}
            following={following}
            nextPath={`/u/${username}/investigations/${slug}`}
            followLabel="Follow this investigation"
            followingLabel="Following this investigation"
          />
        </div>
      )}
      <p className="mt-3 fh-meta">
        {investigation.partCount} {investigation.partCount === 1 ? "part" : "parts"}
        {investigation.location ? (
          <>
            {" · "}
            <LocationLabel
              city={investigation.location.city}
              country={investigation.location.country}
              href={investigation.location.href}
              size="inline"
            />
          </>
        ) : null}
        {" · Updated "}
        <RelativeTime value={investigation.updatedAt} className="inline fh-meta" />
        {livePart ? " · LIVE NOW" : null}
      </p>
      {investigation.description ? <p className="mt-5 fh-body">{investigation.description}</p> : null}
      <p className="mt-4 fh-meta">
        Firsthand organizes firsthand accounts. This investigation is the reporter&apos;s sequence of
        reports. It does not mean Firsthand verified the reporter&apos;s conclusions.
      </p>
      <InvestigationTimeline
        parts={parts}
        startHref={firstPublic ? `#part-${firstPublic.position}` : null}
        latestHref={livePart ? `#part-${livePart.position}` : latestPublic ? `#part-${latestPublic.position}` : null}
      />
    </Page>
  );
}
