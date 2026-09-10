"use client";

import { useEffect, useRef } from "react";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import "leaflet/dist/leaflet.css";

type DiscoveryMapProps = {
  places: DiscoveryPlace[];
};

export function DiscoveryMap({ places }: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    void (async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default;
      if (cancelled || !containerRef.current) {
        return;
      }

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const points = places.filter(
        (place): place is DiscoveryPlace & { latitude: number; longitude: number } =>
          place.latitude !== null && place.longitude !== null,
      );

      const markers = points.map((place) => {
        const marker = L.circleMarker([place.latitude, place.longitude], {
          radius: 9,
          color: "#9f1239",
          weight: 2,
          fillColor: "#fff7ed",
          fillOpacity: 1,
        });
        const name = place.place || place.city;
        marker.bindPopup(
          `<div class="discovery-popup">
            <p class="popup-title">${escapeHtml(name)}</p>
            <p class="popup-meta">${escapeHtml(place.city)}, ${escapeHtml(place.country)}</p>
            <p class="popup-counts">${place.reportCount} firsthand report${place.reportCount === 1 ? "" : "s"} · ${place.openRequestCount} open request${place.openRequestCount === 1 ? "" : "s"}</p>
            <p class="popup-links">
              <a href="/place/${place.slug}#latest">View firsthand reports</a>
              <a href="/place/${place.slug}#open-questions">View open requests</a>
            </p>
          </div>`,
          { maxWidth: 260 },
        );
        marker.addTo(map!);
        return marker;
      });

      if (markers.length === 1) {
        map.setView(markers[0].getLatLng(), 12);
      } else if (markers.length > 1) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25), { padding: [24, 24] });
      } else {
        map.setView([48.2, 16.3], 4);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [places]);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
      <div ref={containerRef} className="h-72 w-full sm:h-[28rem]" />
      <p className="border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-500">
        Markers are places with firsthand reports or open coverage requests. The map is geographic
        discovery, not a ranking of what is important.
      </p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
