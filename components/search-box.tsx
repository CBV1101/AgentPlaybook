"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeographySearchHit } from "@/lib/data/geography";
import type { GeocodeSuggestion } from "@/lib/location";
import { SearchInput } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SearchBoxProps = {
  initialValue?: string;
  size?: "default" | "hero" | "compact";
  autoFocus?: boolean;
};

const kindLabel = {
  country: "Country",
  city: "City",
  place: "Place",
} as const;

export function SearchBox({ initialValue = "", size = "default", autoFocus = false }: SearchBoxProps) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initialValue);
  const [places, setPlaces] = useState<GeographySearchHit[]>([]);
  const [geocoded, setGeocoded] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const compact = size === "compact";
  const hero = size === "hero";

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [placeResponse, geoResponse] = await Promise.all([
          fetch(`/api/places?q=${encodeURIComponent(term)}`, { signal: controller.signal }),
          fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: controller.signal }),
        ]);
        const placePayload = (await placeResponse.json()) as { results?: GeographySearchHit[] };
        const geoPayload = (await geoResponse.json()) as { results?: GeocodeSuggestion[] };
        if (controller.signal.aborted) {
          return;
        }
        setPlaces(placePayload.results ?? []);
        setGeocoded(geoPayload.results ?? []);
        setOpen(true);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setPlaces([]);
        setGeocoded([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className={cn("relative w-full", size === "default" && "mx-auto max-w-xl")}>
      <form action="/search" method="get" className="flex min-w-0 gap-2">
        <label className="sr-only" htmlFor="firsthand-search">
          Search firsthand reporting
        </label>
        <div className="min-w-0 flex-1">
        <SearchInput
          id="firsthand-search"
          name="q"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setPlaces([]);
              setGeocoded([]);
              setOpen(false);
            }
          }}
          onFocus={() => {
            if (places.length + geocoded.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={compact ? "Search" : "Search places, reports, events…"}
          className={
            hero
              ? "mt-0 h-12 w-full px-3 text-base sm:h-14 sm:px-4 sm:text-lg"
              : compact
                ? "mt-0 h-10 w-48 lg:w-64"
                : "mt-0 h-11 w-full text-base"
          }
        />
        </div>
        {compact ? null : (
          <button
            type="submit"
            className={buttonClass("primary", hero ? "h-12 shrink-0 sm:h-14 sm:px-5" : "h-11")}
          >
            Search
          </button>
        )}
      </form>
      {loading && !compact ? <p className="mt-2 fh-label">Searching…</p> : null}
      {open && (places.length > 0 || geocoded.length > 0) ? (
        <ul
          id={listId}
          role="listbox"
          className="fh-menu absolute z-20 mt-2 max-h-72 w-full overflow-auto py-1"
        >
          {places.length > 0 ? <li className="px-3 py-1 fh-label">Places on Firsthand</li> : null}
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-3 text-left text-sm hover:bg-canvas"
                onClick={() => router.push(place.href)}
              >
                <span className="block font-medium text-ink">{place.title}</span>
                <span className="block fh-label">
                  {kindLabel[place.kind]}
                  {place.subtitle ? ` · ${place.subtitle}` : ""} · {place.reportCount} reports
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1 fh-label">All firsthand results</li>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="w-full px-3 py-3 text-left text-sm hover:bg-canvas"
              onClick={() => router.push(`/search?q=${encodeURIComponent(query.trim())}`)}
            >
              <span className="block font-medium text-ink">Search “{query.trim()}”</span>
              <span className="block fh-label">Places, events, reports, coverage, reporters</span>
            </button>
          </li>
          {geocoded.map((result) => (
            <li key={`${result.label}-${result.latitude}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-3 text-left text-sm hover:bg-canvas"
                onClick={() => router.push(`/search?q=${encodeURIComponent(result.city || result.label)}`)}
              >
                <span className="block text-ink">{result.label}</span>
                <span className="block fh-label">Search firsthand coverage</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { SearchBox as LocationSearch };
