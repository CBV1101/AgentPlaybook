"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { GoingOnNow } from "@/components/going-on-now";
import { InteractiveGlobe, type GlobeAnchor, type GlobeFocus } from "@/components/interactive-globe";
import { thumbnailPosition } from "@/lib/explore-popup";
import { LocationLabel } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/field";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";
import { peopleWantThisCovered } from "@/lib/coverage-wanted";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";
import type { GeocodeSuggestion } from "@/lib/location";
import { selectRecentReportForLocation, normalizeCityName, type PlaceQuery } from "@/lib/live-for-location";
import { canonicalPlaceFromSearch, SEARCH_PLACE_MARKER_ID, type CanonicalPlace } from "@/lib/globe-coords";
import { useLocationLiveSession } from "@/components/use-location-live-session";
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
  usingShowcase,
}: ExploreExperienceProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeSuggestion[]>([]);
  const [selected, setSelected] = useState<CanonicalPlace | null>(null);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor] = useState<GlobeAnchor | null>(null);
  const [searching, setSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchGen = useRef(0);
  const selectGen = useRef(0);
  const debounceRef = useRef<number>(0);

  const place: PlaceQuery | null = selected
    ? {
        city: selected.city,
        country: selected.country,
        latitude: selected.latitude,
        longitude: selected.longitude,
        scope: selected.scope,
        boundingBox: selected.boundingBox,
      }
    : null;
  const { streams, index, setIndex } = useLocationLiveSession(place, liveStreams);
  const report = place && streams.length === 0 ? selectRecentReportForLocation(reports, place) : null;

  const globeMarkers = useMemo(() => {
    if (!selected) {
      return markers;
    }
    const pin: GlobeActivityMarker = {
      id: SEARCH_PLACE_MARKER_ID,
      kind: "report",
      latitude: selected.latitude,
      longitude: selected.longitude,
      city: selected.city,
      country: selected.country,
      title: selected.name,
      href: "#",
      subtitle: "SELECTED",
    };
    return [pin, ...markers.filter((item) => item.id !== SEARCH_PLACE_MARKER_ID)];
  }, [markers, selected]);

  const onGlobeAnchor = useCallback((next: GlobeAnchor | null) => {
    setAnchor((prev) => {
      if (next?.visible) {
        return next;
      }
      if (popupOpen && prev?.visible) {
        return {
          ...prev,
          wrapW: next?.wrapW ?? prev.wrapW,
          wrapH: next?.wrapH ?? prev.wrapH,
        };
      }
      return next;
    });
  }, [popupOpen]);

  const flyTo = useCallback((next: CanonicalPlace) => {
    setSelected(next);
    setFocus({ latitude: next.latitude, longitude: next.longitude, zoom: 3.3, nonce: Date.now() });
    setPopupOpen(true);
    setSuggestionsOpen(false);
  }, []);

  const onSelectMarker = useCallback(
    (id: string) => {
      const marker = markers.find((item) => item.id === id);
      if (!marker) {
        return;
      }
      flyTo(
        canonicalPlaceFromSearch({
          city: marker.city,
          country: marker.country,
          name: `${marker.city}, ${marker.country}`,
          latitude: marker.latitude,
          longitude: marker.longitude,
          scope: "city",
        }),
      );
    },
    [flyTo, markers],
  );

  function markerMatchesQuery(marker: GlobeActivityMarker, term: string) {
    const q = term.trim().toLowerCase();
    if (q.length < 2) {
      return false;
    }
    const city = marker.city.toLowerCase();
    const country = marker.country.toLowerCase();
    return (
      city.includes(q) ||
      `${city}, ${country}`.includes(q) ||
      normalizeCityName(marker.city) === normalizeCityName(term) ||
      normalizeCityName(term).includes(normalizeCityName(marker.city))
    );
  }

  const localMatches = useMemo(() => {
    if (query.trim().length < 2) {
      return [];
    }
    const rank = { live: 0, wanted: 1, report: 2 };
    const byCity = new Map<string, GlobeActivityMarker>();
    for (const item of markers) {
      if (!markerMatchesQuery(item, query)) {
        continue;
      }
      const key = `${item.city}|${item.country}`;
      const existing = byCity.get(key);
      if (!existing || rank[item.kind] < rank[existing.kind]) {
        byCity.set(key, item);
      }
    }
    return [...byCity.values()];
  }, [markers, query]);

  async function searchLocation(term: string): Promise<GeocodeSuggestion[]> {
    const trimmed = term.trim();
    const gen = ++searchGen.current;
    if (trimmed.length < 2) {
      setResults([]);
      return [];
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json()) as { results?: GeocodeSuggestion[] };
      if (gen !== searchGen.current) {
        return [];
      }
      const next = payload.results ?? [];
      setResults(next);
      return next;
    } finally {
      if (gen === searchGen.current) {
        setSearching(false);
      }
    }
  }

  function scheduleSearch(term: string) {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void searchLocation(term);
    }, 280);
  }

  function chooseResult(result: GeocodeSuggestion) {
    setQuery(result.label);
    setResults([]);
    flyTo(
      canonicalPlaceFromSearch({
        city: result.city || result.label.split(",")[0]!.trim(),
        country: result.country || "",
        name: result.label,
        latitude: result.latitude,
        longitude: result.longitude,
        scope: result.scope,
        boundingBox: result.boundingBox,
      }),
    );
  }

  async function lookUpPlace() {
    const gen = ++selectGen.current;
    const trimmed = query.trim();
    let next = results;
    if (next.length === 0) {
      next = await searchLocation(trimmed);
    }
    if (gen !== selectGen.current) {
      return;
    }
    if (next[0]) {
      chooseResult(next[0]);
      return;
    }
    const local = localMatches[0];
    if (local) {
      flyTo(
        canonicalPlaceFromSearch({
          city: local.city,
          country: local.country,
          name: `${local.city}, ${local.country}`,
          latitude: local.latitude,
          longitude: local.longitude,
          scope: "city",
        }),
      );
    }
  }

  const selectedActivity = useMemo(() => {
    if (!selected) {
      return null;
    }
    return (
      markers.find(
        (item) =>
          Math.abs(item.latitude - selected.latitude) < 0.08 &&
          Math.abs(item.longitude - selected.longitude) < 0.08,
      ) ?? null
    );
  }, [markers, selected]);

  return (
    <div>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void lookUpPlace();
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
            setSuggestionsOpen(true);
            scheduleSearch(value);
          }}
          placeholder="New York City, Berlin, Nairobi…"
          className="mt-0 h-11 w-full"
        />
        <button type="submit" className={buttonClass("primary", "h-11 shrink-0")}>
          Look
        </button>
      </form>
      {selected ? (
        <span
          hidden
          data-canonical-place
          data-city={selected.city}
          data-country={selected.country}
          data-latitude={String(selected.latitude)}
          data-longitude={String(selected.longitude)}
        />
      ) : null}
      {suggestionsOpen && (localMatches.length > 0 || results.length > 0) ? (
        <ul className="fh-menu mt-2 max-h-64 overflow-auto py-1" role="listbox">
          {localMatches.slice(0, 4).map((marker) => (
            <li key={`local-${marker.id}`}>
              <button
                type="button"
                className="w-full px-3 py-3 text-left text-sm hover:bg-canvas"
                onClick={() => {
                  setQuery(`${marker.city}, ${marker.country}`);
                  setResults([]);
                  flyTo(
                    canonicalPlaceFromSearch({
                      city: marker.city,
                      country: marker.country,
                      name: `${marker.city}, ${marker.country}`,
                      latitude: marker.latitude,
                      longitude: marker.longitude,
                      scope: "city",
                    }),
                  );
                }}
              >
                <span className="block font-medium text-ink">{marker.city}, {marker.country}</span>
                <span className="block fh-label">Firsthand activity here</span>
              </button>
            </li>
          ))}
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

      <div className="relative mt-6">
        <InteractiveGlobe
          markers={globeMarkers}
          selectedId={selected ? SEARCH_PLACE_MARKER_ID : null}
          anchorLocation={selected}
          focus={focus}
          onSelect={onSelectMarker}
          onAnchorChange={onGlobeAnchor}
          pauseRotation={popupOpen}
          idleRotate
          size="explore"
        />
        {popupOpen && place ? <GeoAnchoredGoingOnNow
          anchor={anchor}
          city={place.city}
          country={place.country}
          streams={streams}
          index={index}
          report={report}
          onClose={() => setPopupOpen(false)}
          onIndexChange={setIndex}
        /> : null}
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-live" /> Live now</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-earth" /> Coverage wanted</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-geo" /> Recent report</li>
        </ul>
        <p className="mt-2 fh-meta">
          Drag to rotate Earth. Scroll to zoom. Search a city to fly there. Closing a stream keeps you looking at that place.
        </p>
      </div>

      {usingShowcase ? (
        <p className="mt-3 text-xs text-geo">Development showcase streams are not stored in Supabase.</p>
      ) : null}

      {selectedActivity && !popupOpen ? (
        <MarkerPreview marker={selectedActivity} className="mt-6" />
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
                  selected &&
                    Math.abs(marker.latitude - selected.latitude) < 0.08 &&
                    Math.abs(marker.longitude - selected.longitude) < 0.08 &&
                    "bg-geo-soft/60",
                )}
                onClick={() =>
                  flyTo(
                    canonicalPlaceFromSearch({
                      city: marker.city,
                      country: marker.country,
                      name: `${marker.city}, ${marker.country}`,
                      latitude: marker.latitude,
                      longitude: marker.longitude,
                      scope: "city",
                    }),
                  )
                }
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

function GeoAnchoredGoingOnNow({
  anchor,
  city,
  country,
  streams,
  index,
  report,
  onClose,
  onIndexChange,
}: {
  anchor: GlobeAnchor | null;
  city: string;
  country: string;
  streams: LiveStreamSummary[];
  index: number;
  report?: FirsthandReport | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const pos = thumbnailPosition(anchor, typeof window !== "undefined" && window.innerWidth < 640 ? 236 : 260);
  if (pos.hidden) {
    return null;
  }
  return (
    <div
      className="pointer-events-auto absolute z-20"
      data-explore-popup="geo"
      data-popup-side={pos.side}
      style={{ left: pos.left, top: pos.top, width: pos.width }}
    >
      <GoingOnNow
        city={city}
        country={country}
        streams={streams}
        index={index}
        report={report}
        onClose={onClose}
        onIndexChange={onIndexChange}
      />
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
