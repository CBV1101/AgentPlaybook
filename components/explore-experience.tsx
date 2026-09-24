"use client";

import { useMemo, useState } from "react";
import { DiscoveryMap } from "@/components/discovery-map";
import { LiveStreamCard } from "@/components/featured-live-stream";
import { GLOBE_LOCAL_ZOOM, InteractiveGlobe, type GlobeFocus } from "@/components/interactive-globe";
import { ReportCard } from "@/components/report-card";
import { LocationLabel } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/field";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";
import { peopleWantThisCovered } from "@/lib/coverage-wanted";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";
import type { GeocodeSuggestion } from "@/lib/location";
import { cn } from "@/lib/cn";
import Link from "next/link";

type ExploreExperienceProps = {
  markers: GlobeActivityMarker[];
  liveStreams: LiveStreamSummary[];
  reports: FirsthandReport[];
  places: DiscoveryPlace[];
  usingShowcase: boolean;
};

export function ExploreExperience({
  markers,
  liveStreams,
  reports,
  places,
  usingShowcase,
}: ExploreExperienceProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeSuggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(markers[0]?.id ?? null);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [searching, setSearching] = useState(false);

  const selected = markers.find((item) => item.id === selectedId) ?? null;
  const localMode = zoom >= GLOBE_LOCAL_ZOOM;
  const lives = liveStreams.slice(0, 6);
  const fallbackReports = reports.slice(0, 6);

  async function searchLocation(term: string) {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json()) as { results?: GeocodeSuggestion[] };
      setResults(payload.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  function flyTo(latitude: number, longitude: number, markerId?: string) {
    setFocus({ latitude, longitude, zoom: 2.45 });
    if (markerId) {
      setSelectedId(markerId);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setZoom(GLOBE_LOCAL_ZOOM), reduced ? 0 : 720);
  }

  function chooseResult(result: GeocodeSuggestion) {
    setQuery(result.label);
    setResults([]);
    const match = markers.find(
      (item) =>
        item.city.toLowerCase() === result.city.toLowerCase() &&
        item.country.toLowerCase() === result.country.toLowerCase(),
    );
    flyTo(result.latitude, result.longitude, match?.id);
  }

  const mapPlaces = useMemo(() => {
    if (!selected) {
      return places;
    }
    return places.filter((place) => place.city === selected.city && place.country === selected.country);
  }, [places, selected]);

  return (
    <div>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const match = results[0];
          if (match) {
            chooseResult(match);
            return;
          }
          void searchLocation(query);
        }}
      >
        <label className="sr-only" htmlFor="explore-search">
          Where do you want to look?
        </label>
        <SearchInput
          id="explore-search"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            void searchLocation(value);
          }}
          placeholder="Berlin, Ceuta, Sendai…"
          className="mt-0 h-11 w-full"
        />
        <button type="submit" className={buttonClass("primary", "h-11 shrink-0")}>
          Look
        </button>
      </form>
      {searching ? <p className="mt-2 fh-label">Finding that place…</p> : null}
      {results.length > 0 ? (
        <ul className="fh-menu mt-2 max-h-64 overflow-auto py-1" role="listbox">
          {results.map((result) => (
            <li key={`${result.label}-${result.latitude}`}>
              <button
                type="button"
                className="w-full px-3 py-3 text-left text-sm hover:bg-canvas"
                onClick={() => chooseResult(result)}
              >
                <span className="block font-medium text-ink">{result.label}</span>
                <span className="block fh-label">Fly to this location</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.8fr)]">
        <div>
          {localMode ? (
            <DiscoveryMap
              places={mapPlaces.length ? mapPlaces : places}
              caption="City view — coverage demand, live reports, and recent firsthand accounts."
            />
          ) : (
            <InteractiveGlobe
              markers={markers}
              selectedId={selectedId}
              focus={focus}
              onSelect={setSelectedId}
              onZoomChange={setZoom}
            />
          )}
          {localMode ? (
            <p className="mt-3">
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={() => {
                  setZoom(1.15);
                  setFocus(null);
                }}
              >
                Back to world view
              </button>
            </p>
          ) : null}
          <p className="mt-2 fh-meta">
            {localMode
              ? "Zoomed to a conventional map. Return to world view to rotate the globe again."
              : "Drag to rotate. Scroll to zoom toward a city. Activity list below is keyboard accessible."}
          </p>
          <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-live" /> Live</li>
            <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-earth" /> Coverage wanted</li>
            <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-geo" /> Recent report</li>
          </ul>
        </div>

        <div className="lg:fh-live-stage lg:rounded-2xl lg:p-4">
          {lives.length > 0 ? (
            <div>
              <p className="fh-kicker text-live lg:text-[color:var(--color-live)]">Live around the world</p>
              <h2 className="mt-1 fh-section lg:text-surface">What people are showing now</h2>
              <div className="mt-4 hidden flex-col gap-4 lg:flex">
                {lives.slice(0, 3).map((stream) => (
                  <button
                    key={stream.id}
                    type="button"
                    className="text-left"
                    onClick={() =>
                      flyTo(stream.location.latitude ?? 0, stream.location.longitude ?? 0, `live:${stream.id}`)
                    }
                  >
                    <LiveStreamCard stream={stream} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="fh-kicker">Latest from around the world</p>
              <h2 className="mt-1 fh-section lg:text-surface">No one is live right now</h2>
              <p className="mt-2 fh-meta lg:text-surface/70">
                {usingShowcase
                  ? "Development showcase is off because this is a truthful empty live state."
                  : "Recent published reports stay available. Live appears here only when someone is broadcasting."}
              </p>
            </div>
          )}
        </div>
      </div>

      {lives.length > 0 ? (
        <div className="fh-live-stage -mx-4 mt-5 px-4 py-4 lg:hidden">
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {lives.map((stream) => (
            <button
              key={stream.id}
              type="button"
              className="text-left"
              onClick={() => flyTo(stream.location.latitude ?? 0, stream.location.longitude ?? 0, `live:${stream.id}`)}
            >
              <LiveStreamCard stream={stream} compact />
            </button>
          ))}
          </div>
        </div>
      ) : fallbackReports.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fallbackReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : null}

      {selected ? (
        <MarkerPreview marker={selected} className="mt-6" />
      ) : null}

      <section className="mt-8">
        <p className="fh-kicker">Activity</p>
        <h2 className="mt-1 fh-section">Places with Firsthand activity</h2>
        <ul className="mt-4 divide-y divide-line">
          {markers.map((marker) => (
            <li key={marker.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start justify-between gap-4 py-3 text-left hover:bg-canvas fh-focus",
                  selectedId === marker.id && "bg-geo-soft/60",
                )}
                onClick={() => flyTo(marker.latitude, marker.longitude, marker.id)}
              >
                <span>
                  <LocationLabel city={marker.city} country={marker.country} size="card" />
                  <span className="mt-1 block text-sm font-medium text-ink">{marker.title}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-muted">{marker.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MarkerPreview({ marker, className }: { marker: GlobeActivityMarker; className?: string }) {
  return (
    <article className={cn("rounded-xl border border-geo/20 bg-surface p-4", className)}>
      <LocationLabel city={marker.city} country={marker.country} size="card" />
      <p className="mt-2 fh-kicker">{marker.subtitle}</p>
      <h3 className="mt-1 fh-report-title">{marker.title}</h3>
      {marker.reporterName ? <p className="mt-2 fh-meta">{marker.reporterName}</p> : null}
      {marker.interestedCount != null ? (
        <p className="mt-2 text-sm font-medium text-earth">{peopleWantThisCovered(marker.interestedCount)}</p>
      ) : null}
      <p className="mt-4">
        <Link href={marker.href} className={buttonClass("primary")}>
          {marker.kind === "live" ? "Watch live" : marker.kind === "wanted" ? "Request coverage" : "Open report"}
        </Link>
      </p>
    </article>
  );
}
