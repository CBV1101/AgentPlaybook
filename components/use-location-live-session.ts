"use client";

import { useEffect, useMemo, useState } from "react";
import { listLiveStreamsForLocation, type PlaceQuery } from "@/lib/live-for-location";
import { mergeLiveSessionOrder } from "@/lib/explore-popup";
import type { LiveStreamSummary } from "@/lib/live";

export function useLocationLiveSession(place: PlaceQuery | null, liveStreams: LiveStreamSummary[]) {
  const key = place
    ? [
        place.city,
        place.country,
        place.scope ?? "city",
        place.latitude,
        place.longitude,
        place.boundingBox
          ? `${place.boundingBox.south},${place.boundingBox.north},${place.boundingBox.west},${place.boundingBox.east}`
          : "",
      ].join("|")
    : "";
  const ranked = useMemo(() => (place ? listLiveStreamsForLocation(liveStreams, place) : []), [liveStreams, place]);
  const rankedKey = ranked.map((item) => item.id).join(",");
  const [sessionKey, setSessionKey] = useState(key);
  const [order, setOrder] = useState<string[]>(() => ranked.map((item) => item.id));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const rankedIds = rankedKey ? rankedKey.split(",") : [];
    const locationChanged = key !== sessionKey;
    if (locationChanged) {
      setSessionKey(key);
      setIndex(0);
    }
    setOrder((prev) => mergeLiveSessionOrder(prev, rankedIds, locationChanged));
  }, [key, rankedKey, sessionKey]);

  const streams = order
    .map((id) => ranked.find((item) => item.id === id))
    .filter((item): item is LiveStreamSummary => Boolean(item));

  useEffect(() => {
    if (streams.length === 0) {
      setIndex(0);
      return;
    }
    if (index > streams.length - 1) {
      setIndex(streams.length - 1);
    }
  }, [index, streams.length]);

  return { streams, index, setIndex };
}
