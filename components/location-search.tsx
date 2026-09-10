"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { GeocodeSuggestion } from "@/lib/location";

type LocationSearchProps = {
  initialValue?: string;
};

export function LocationSearch({ initialValue = "" }: LocationSearchProps) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initialValue);
  const [places, setPlaces] = useState<DiscoveryPlace[]>([]);
  const [geocoded, setGeocoded] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        const placePayload = (await placeResponse.json()) as { results?: DiscoveryPlace[] };
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

  function goToArchive(slug: string) {
    router.push(`/place/${slug}`);
  }

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <form action="/browse" method="get" className="flex gap-2">
        <label className="sr-only" htmlFor="location-search">
          Search by location
        </label>
        <input
          id="location-search"
          name="location"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
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
          placeholder="Search a place, city, or country"
          className="min-h-12 w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-base text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-stone-500"
        />
        <button
          type="submit"
          className="min-h-12 rounded-full bg-rose-800 px-5 py-3 text-sm font-medium text-rose-50 hover:bg-rose-700"
        >
          Search
        </button>
      </form>
      {loading ? <p className="mt-2 text-xs text-stone-500">Searching places…</p> : null}
      {open && (places.length > 0 || geocoded.length > 0) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {places.length > 0 ? (
            <li className="px-3 py-1 text-xs uppercase tracking-wide text-stone-400">On Firsthand</li>
          ) : null}
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-3 text-left text-sm hover:bg-stone-50"
                onClick={() => goToArchive(place.slug)}
              >
                <span className="block font-medium text-stone-900">{place.label}</span>
                <span className="block text-xs text-stone-500">
                  {place.reportCount} reports · {place.openRequestCount} open requests
                </span>
              </button>
            </li>
          ))}
          {geocoded.map((result) => (
            <li key={`${result.label}-${result.latitude}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-3 text-left text-sm hover:bg-stone-50"
                onClick={() => {
                  const match = places.find(
                    (place) =>
                      place.city.toLowerCase() === result.city.toLowerCase() &&
                      place.country.toLowerCase() === result.country.toLowerCase() &&
                      (place.place || "").toLowerCase() === (result.place || "").toLowerCase(),
                  );
                  if (match) {
                    goToArchive(match.slug);
                    return;
                  }
                  router.push(`/browse?location=${encodeURIComponent(result.label)}`);
                }}
              >
                <span className="block text-stone-900">{result.label}</span>
                <span className="block text-xs text-stone-500">Search coverage for this place</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
