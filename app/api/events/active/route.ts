import { NextResponse } from "next/server";
import { listActiveEvents, listActiveEventsAtLocation } from "@/lib/data";
import { parseCoordinate } from "@/lib/location";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId")?.trim() ?? "";

  if (locationId) {
    const events = await listActiveEvents(locationId);
    return NextResponse.json({ events });
  }

  const country = searchParams.get("country")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const place = searchParams.get("place")?.trim() || null;
  const latitude = parseCoordinate(searchParams.get("latitude") ?? "");
  const longitude = parseCoordinate(searchParams.get("longitude") ?? "");

  if (!country || !city || latitude === null || longitude === null) {
    return NextResponse.json({ events: [] });
  }

  const events = await listActiveEventsAtLocation({
    country,
    city,
    place,
    latitude,
    longitude,
  });
  return NextResponse.json({ events });
}
