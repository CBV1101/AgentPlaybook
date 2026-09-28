"use client";

import { useMemo, useState } from "react";
import { GoingOnNow } from "@/components/going-on-now";
import { InteractiveGlobe, type GlobeAnchor } from "@/components/interactive-globe";
import { thumbnailPosition } from "@/lib/explore-popup";
import { useLocationLiveSession } from "@/components/use-location-live-session";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";
import { liveHref, reporterProfileHref, type LiveStreamSummary } from "@/lib/live";
import { selectRecentReportForLocation, type PlaceQuery } from "@/lib/live-for-location";
import type { FirsthandReport } from "@/lib/types";
import Link from "next/link";

export function HomeGlobeExperience({
  liveStreams,
  reports,
}: {
  liveStreams: LiveStreamSummary[];
  reports: FirsthandReport[];
}) {
  const markers = useMemo<GlobeActivityMarker[]>(() => collapseLivePlaceMarkers(liveStreams), [liveStreams]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor] = useState<GlobeAnchor | null>(null);

  const selected = markers.find((item) => item.id === selectedId) ?? null;
  const place: PlaceQuery | null = selected
    ? {
        city: selected.city,
        country: selected.country,
        latitude: selected.latitude,
        longitude: selected.longitude,
      }
    : null;
  const { streams, index, setIndex } = useLocationLiveSession(place, liveStreams);
  const report = place && streams.length === 0 ? selectRecentReportForLocation(reports, place) : null;

  return (
    <div>
      <div className="relative">
        <InteractiveGlobe
          markers={markers}
          selectedId={selectedId}
          anchorLocation={
            selected
              ? { latitude: selected.latitude, longitude: selected.longitude }
              : null
          }
          onSelect={(id) => {
            setSelectedId(id);
            setPopupOpen(true);
          }}
          onAnchorChange={setAnchor}
          pauseRotation={popupOpen}
          idleRotate
          size="hero"
        />
        {popupOpen && selected ? (
          (() => {
            const pos = thumbnailPosition(anchor, 240);
            if (pos.hidden) {
              return null;
            }
            return (
              <div
                className="pointer-events-auto absolute z-10"
                style={{ left: pos.left, top: pos.top, width: pos.width }}
              >
                <GoingOnNow
                  city={selected.city}
                  country={selected.country}
                  streams={streams}
                  index={index}
                  report={report}
                  onClose={() => setPopupOpen(false)}
                  onIndexChange={setIndex}
                />
              </div>
            );
          })()
        ) : null}
      </div>
      <p className="mt-3">
        <Link href="/browse" className="text-sm font-medium text-ink underline underline-offset-2">
          Explore the world →
        </Link>
      </p>
    </div>
  );
}

function collapseLivePlaceMarkers(liveStreams: LiveStreamSummary[]): GlobeActivityMarker[] {
  const byPlace = new Map<string, LiveStreamSummary>();
  for (const item of liveStreams) {
    if (item.location.latitude == null || item.location.longitude == null) {
      continue;
    }
    const key = `${item.location.city}|${item.location.country}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, item);
    }
  }
  return [...byPlace.values()].slice(0, 8).map((item) => ({
    id: `live-place:${item.location.city}|${item.location.country}`,
    kind: "live" as const,
    latitude: item.location.latitude as number,
    longitude: item.location.longitude as number,
    city: item.location.city,
    country: item.location.country,
    title: item.title,
    href: reporterProfileHref(item.reporterUsername) ?? liveHref(item.id),
    subtitle: "LIVE",
    reporterName: item.reporterName,
  }));
}
