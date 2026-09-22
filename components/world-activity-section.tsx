import { DiscoveryMap } from "@/components/discovery-map";
import { LocationLabel } from "@/components/ui/badge";
import { EmptyState, Section } from "@/components/ui/page";
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
  const featured = cities.slice(0, 10);
  const mapPlaces = places.filter((place) => place.reportCount > 0 || place.openRequestCount > 0 || place.liveCount > 0);

  return (
    <Section
      kicker="Around the world"
      title="Happening around the world"
      action={
        <Link href="/browse" className="shrink-0 text-sm text-brand underline underline-offset-2">
          Browse all
        </Link>
      }
    >
      {featured.length === 0 ? (
        <EmptyState title="No places have coverage yet. Search a location to start." />
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <ul className="divide-y divide-line">
            {featured.map((city) => (
              <li key={city.slug}>
                <Link href={city.href} className="flex items-baseline justify-between gap-4 py-3 hover:bg-surface/80">
                  <LocationLabel city={city.name} country={city.country} size="card" />
                  <span className="shrink-0 text-right fh-meta">
                    {activityLine(city)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {mapPlaces.length > 0 ? (
            <DiscoveryMap places={mapPlaces} compact caption="Places with reports, open requests, or someone live." />
          ) : null}
        </div>
      )}
    </Section>
  );
}

function activityLine(city: CityBrowse) {
  const parts: string[] = [];
  if (city.liveCount > 0) {
    parts.push(city.liveCount === 1 ? "1 live" : `${city.liveCount} live`);
  }
  if (city.reportCount > 0) {
    parts.push(city.reportCount === 1 ? "1 report" : `${city.reportCount} reports`);
  }
  if (city.openRequestCount > 0) {
    parts.push(
      city.openRequestCount === 1
        ? "1 open request"
        : `${city.openRequestCount} open requests`,
    );
  }
  return parts.join(" · ");
}
