import { NextResponse } from "next/server";
import { getDevReferenceWhepPlaybackUrl } from "@/lib/live/dev-whep-discovery";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await getDevReferenceWhepPlaybackUrl();
  return NextResponse.json({
    whepUrl: result.whepUrl,
    connected: Boolean(result.whepUrl),
  });
}
