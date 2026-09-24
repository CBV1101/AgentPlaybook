import { DiscoveryMap } from "@/components/discovery-map";
import { LocationLabel } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { CityBrowse } from "@/lib/data/geography";
import Link from "next/link";

export function WorldActivitySection({
  cities,
  places,
}: {
  cities: CityBrowse[];
  places: DiscoveryPlace[];
}) {
  const featured = cities.slice(0, 8);
  const mapPlaces = places.filter((place) => place.reportCount > 0 || place.openRequestCount > 0 || place.liveCount > 0);

  return (
    <section className="mt-10 rounded-2xl border border-geo/20 bg-geo-soft/50 p-4 sm:mt-12 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-geo">Around the world</p>
          <h2 className="mt-1 fh-section">Active places</h2>
        </div>
        <Link href="/browse" className="shrink-0 text-sm font-medium text-brand underline underline-offset-2">
          Browse all
        </Link>
      </div>
      {featured.length === 0 ? (
        <EmptyState title="No places have coverage yet. Search a location to start." />
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          {mapPlaces.length > 0 ? (
            <DiscoveryMap places={mapPlaces} compact caption="Live, reports, and open requests — geographic discovery, not a ranking." />
          ) : null}
          <ul>
            {featured.map((city) => (
              <li key={city.slug} className="border-b border-geo/15 last:border-b-0">
                <Link href={city.href} className="flex items-baseline justify-between gap-4 py-3.5 hover:bg-surface/50">
                  <LocationLabel city={city.name} country={city.country} size="card" />
                  <span className="shrink-0 text-right text-sm text-ink">{activityLine(city)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function activityLine(city: CityBrowse) {
  const parts: string[] = [];
  if (city.liveCount > 0) {
    parts.push(city.liveCount === 1 ? "1 live" : `${city.liveCount} live`);
  }
  if (city.openRequestCount > 0) {
    parts.push(city.openRequestCount === 1 ? "1 request" : `${city.openRequestCount} requests`);
  }
  if (city.reportCount > 0) {
    parts.push(city.reportCount === 1 ? "1 report" : `${city.reportCount} reports`);
  }
  return parts.join(" · ");
}
