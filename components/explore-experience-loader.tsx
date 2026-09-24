"use client";

import dynamic from "next/dynamic";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";

const ExploreExperience = dynamic(
  () => import("@/components/explore-experience").then((mod) => mod.ExploreExperience),
  { ssr: false, loading: () => <p className="mt-6 fh-meta">Loading the globe…</p> },
);

export function ExploreExperienceLoader(props: {
  markers: GlobeActivityMarker[];
  liveStreams: LiveStreamSummary[];
  reports: FirsthandReport[];
  places: DiscoveryPlace[];
  usingShowcase: boolean;
}) {
  return <ExploreExperience {...props} />;
}
