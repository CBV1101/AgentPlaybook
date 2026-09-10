"use client";

import { useEffect, useId, useState } from "react";
import type { GeocodeSuggestion } from "@/lib/location";

type GeocodedLocationFieldProps = {
  initialQuery?: string;
};

export function GeocodedLocationField({ initialQuery = "" }: GeocodedLocationFieldProps) {
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeocodeSuggestion[]>([]);
  const [selected, setSelected] = useState<GeocodeSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = query.trim();
  const skipSearch = Boolean(selected && query === selected.label) || searchTerm.length < 2;

  useEffect(() => {
    if (skipSearch) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchTerm)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          results?: GeocodeSuggestion[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Location search failed.");
        }
        setResults(payload.results ?? []);
        setOpen(true);
      } catch (cause) {
        if (controller.signal.aborted) {
          return;
        }
        setResults([]);
        setError(cause instanceof Error ? cause.message : "Location search failed.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchTerm, skipSearch]);

  function choose(suggestion: GeocodeSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setOpen(false);
    setResults([]);
  }

  const visibleResults = searchTerm.length < 2 ? [] : results;

  return (
    <div className="relative">
      <label htmlFor="location-query" className="block text-sm font-medium text-stone-700">
        Location
      </label>
      <input
        id="location-query"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        placeholder="Görlitzer Park, Berlin, Germany"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setSelected(null);
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setOpen(false);
            setError(null);
          }
        }}
        onFocus={() => {
          if (visibleResults.length > 0) {
            setOpen(true);
          }
        }}
        className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 px-3 py-3 text-base outline-none focus:border-stone-500"
      />
      <p className="mt-1 text-xs text-stone-500">
        Search for a place, then choose a result so we can store country, city, coordinates, and a
        map pin.
      </p>
      {loading ? <p className="mt-1 text-xs text-stone-500">Searching places…</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-800">{error}</p> : null}

      {open && visibleResults.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {visibleResults.map((result) => (
            <li key={`${result.label}-${result.latitude}-${result.longitude}`}>
              <button
                type="button"
                role="option"
                aria-selected={selected?.label === result.label}
          className="min-h-12 w-full px-3 py-3 text-left text-sm hover:bg-stone-50"
                onClick={() => choose(result)}
              >
                <span className="block text-stone-900">{result.label}</span>
                <span className="block text-xs text-stone-500">
                  {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input type="hidden" name="location_country" value={selected?.country ?? ""} />
      <input type="hidden" name="location_city" value={selected?.city ?? ""} />
      <input type="hidden" name="location_place" value={selected?.place ?? ""} />
      <input type="hidden" name="location_latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="location_longitude" value={selected?.longitude ?? ""} />
    </div>
  );
}
