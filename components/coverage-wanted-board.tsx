"use client";

import { CoverageWantedCard } from "@/components/coverage-wanted-card";
import { Button, buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState, Section } from "@/components/ui/page";
import {
  distanceKm,
  filterWantedItems,
  formatDistanceKm,
  nearbyWantedItems,
  WANTED_RADII_KM,
  wantedCities,
  wantedCountries,
  type GeoOrigin,
  type WantedRadiusKm,
  type WantedSort,
} from "@/lib/coverage-wanted";
import type { CoverageRequest } from "@/lib/types";
import { useMemo, useState } from "react";

type CoverageWantedBoardProps = {
  items: CoverageRequest[];
  isAuthenticated: boolean;
};

export function CoverageWantedBoard({ items, isAuthenticated }: CoverageWantedBoardProps) {
  const [sort, setSort] = useState<WantedSort>("hot");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState<WantedRadiusKm | null>(null);
  const [origin, setOrigin] = useState<GeoOrigin | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const countries = wantedCountries(items);
  const cities = wantedCities(items, country || undefined);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser cannot share a location.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
        setRadiusKm((current) => current ?? 25);
      },
      () => {
        setLocating(false);
        setOrigin(null);
        setRadiusKm(null);
        if (sort === "nearest") {
          setSort("most_wanted");
        }
        setLocationError("Location was not shared. The rest of Coverage wanted still works.");
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  }

  const filtered = useMemo(
    () =>
      filterWantedItems(items, {
        country: country || undefined,
        city: city || undefined,
        origin,
        radiusKm: null,
        sort: origin ? sort : sort === "nearest" ? "most_wanted" : sort,
      }),
    [items, country, city, origin, sort],
  );

  const nearby = origin ? nearbyWantedItems(items, origin, radiusKm ?? 25) : [];

  return (
    <div>
      <div className="border-y border-line py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            <span className="fh-label">Sort</span>
            <Select
              value={origin ? sort : sort === "nearest" ? "most_wanted" : sort}
              onChange={(event) => setSort(event.target.value as WantedSort)}
            >
              <option value="hot">Hot</option>
              <option value="most_wanted">Most requested</option>
              <option value="newest">Newest</option>
              <option value="unanswered">Unanswered</option>
              {origin ? <option value="nearest">Nearby</option> : null}
            </Select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            <span className="fh-label">Country</span>
            <Select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setCity("");
              }}
            >
              <option value="">All countries</option>
              {countries.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            <span className="fh-label">City</span>
            <Select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">All cities</option>
              {cities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-4">
          <p className="fh-label">Distance</p>
          <p className="mt-1 fh-meta">
            Optional. Firsthand asks once and does not store or continuously track your browser
            location.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={requestLocation}>
              {locating ? "Checking location…" : origin ? "Update location" : "Use my location"}
            </Button>
            {WANTED_RADII_KM.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => {
                  setRadiusKm(km);
                  if (!origin) {
                    requestLocation();
                  }
                }}
                className={buttonClass(origin && radiusKm === km ? "primary" : "secondary")}
              >
                Within {km} km
              </button>
            ))}
            {origin ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRadiusKm(null);
                  setOrigin(null);
                  if (sort === "nearest") {
                    setSort("most_wanted");
                  }
                }}
              >
                Clear location
              </Button>
            ) : null}
          </div>
          {locationError ? <p className="mt-2 fh-meta">{locationError}</p> : null}
        </div>
      </div>

      {origin ? (
        <Section
          title="Coverage wanted near you"
          description={`Open questions within ${radiusKm ?? 25} km, using an approximate distance. This is not stored on your account.`}
        >
          {nearby.length === 0 ? (
            <EmptyState title="No open coverage requests in that radius." />
          ) : (
            <div className="fh-grid">
              {nearby.map((request) => {
                const km = distanceKm(origin, request.latitude, request.longitude);
                return (
                  <CoverageWantedCard
                    key={request.id}
                    request={request}
                    isAuthenticated={isAuthenticated}
                    distanceLabel={km == null ? null : formatDistanceKm(km)}
                  />
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section title="Open coverage requests">
        {filtered.length === 0 ? (
          <EmptyState title="No open coverage requests match these filters." />
        ) : (
          <div className="fh-grid">
            {filtered.map((request) => {
              const km = origin ? distanceKm(origin, request.latitude, request.longitude) : null;
              return (
                <CoverageWantedCard
                  key={request.id}
                  request={request}
                  isAuthenticated={isAuthenticated}
                  distanceLabel={km == null ? null : formatDistanceKm(km)}
                />
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
