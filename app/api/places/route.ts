import { NextResponse } from "next/server";
import { searchGeography } from "@/lib/queries";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchGeography(query);
  return NextResponse.json({ results: results.slice(0, 10) });
}
