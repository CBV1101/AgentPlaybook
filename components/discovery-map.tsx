"use client";

import { useEffect, useRef } from "react";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import "leaflet/dist/leaflet.css";

type DiscoveryMapProps = {
  places: DiscoveryPlace[];
  compact?: boolean;
  caption?: string;
};

export function DiscoveryMap({ places, compact = false, caption }: DiscoveryMapProps) {
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
        const live = place.liveCount > 0;
        const marker = L.circleMarker([place.latitude, place.longitude], {
          radius: live ? 11 : 9,
          color: live ? "#c8102e" : "#2f5d62",
          weight: live ? 3 : 2,
          fillColor: live ? "#c8102e" : "#fffcf7",
          fillOpacity: live ? 0.85 : 1,
        });
        const name = place.place || place.city;
        const href = place.href || `/place/${place.slug}`;
        const liveLine = live
          ? `<p class="popup-live">LIVE · ${place.liveCount} live firsthand report${place.liveCount === 1 ? "" : "s"}</p>`
          : "";
        marker.bindPopup(
          `<div class="discovery-popup">
            <p class="popup-title">${escapeHtml(name)}</p>
            <p class="popup-meta">${escapeHtml(place.city)}, ${escapeHtml(place.country)}</p>
            ${liveLine}
            <p class="popup-counts">${place.reportCount} firsthand report${place.reportCount === 1 ? "" : "s"} · ${place.openRequestCount} open request${place.openRequestCount === 1 ? "" : "s"}</p>
            <p class="popup-links">
              <a href="${href}">Open archive</a>
            </p>
          </div>`,
          { maxWidth: 260 },
        );
        marker.addTo(map!);
        return marker;
      });

      if (markers.length === 1) {
        map.setView(markers[0].getLatLng(), 11);
      } else if (markers.length > 1) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2), {
          padding: [32, 24],
          maxZoom: 12,
        });
      } else {
        map.setView([20, 10], 2);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [places]);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-canvas">
      <div ref={containerRef} className={compact ? "h-48 w-full sm:h-64" : "h-72 w-full sm:h-[28rem]"} />
      <p className="border-t border-line bg-surface px-4 py-2 text-xs text-muted">
        {caption
          ?? (compact
            ? "Places with reports, open requests, or someone live. Open a marker to go to that archive."
            : "Markers are locations with firsthand reports, open coverage requests, or live broadcasts. Filled live markers mean someone is live there now. The map fits those points automatically. It is geographic discovery, not a ranking.")}
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
