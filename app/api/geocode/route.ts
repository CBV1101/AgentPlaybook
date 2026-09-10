import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchPlaces(query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Location search failed.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
