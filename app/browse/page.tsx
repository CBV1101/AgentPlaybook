import { ExploreExperienceLoader } from "@/components/explore-experience-loader";
import { GeographyBreadcrumbs } from "@/components/geography-breadcrumbs";
import { Notice, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { getExplorePresentation } from "@/lib/explore-presentation";

export default async function BrowsePage() {
  const user = await getCurrentUser();
  const presentation = await getExplorePresentation(user?.id);

  return (
    <Page width="home">
      {presentation.usingShowcase ? (
        <Notice>
          Development showcase — visual fallback only. Not stored in Supabase and never shown in
          production.
        </Notice>
      ) : null}
      <GeographyBreadcrumbs items={[{ href: "/", label: "World" }, { label: "Explore" }]} />
      <p className="mt-4 fh-kicker">Explore</p>
      <h1 className="mt-2 fh-hero">Where do you want to look?</h1>
      <p className="mt-3 max-w-2xl fh-lede">
        Go anywhere in the world. Search a place, fly there, and see live reports, coverage demand,
        and recent firsthand accounts.
      </p>
      <ExploreExperienceLoader
        markers={presentation.markers}
        liveStreams={presentation.liveStreams}
        reports={presentation.reports}
        places={presentation.places}
        usingShowcase={presentation.usingShowcase}
      />
    </Page>
  );
}
