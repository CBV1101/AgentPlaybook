import { NextResponse } from "next/server";
import { getConnectedCloudflareWhepPlaybackUrl, isCloudflareLiveConfigured } from "@/lib/media/cloudflare-live";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isCloudflareLiveConfigured()) {
    return NextResponse.json({ whepUrl: null, connected: false });
  }
  const whepUrl = await getConnectedCloudflareWhepPlaybackUrl();
  return NextResponse.json({
    whepUrl,
    connected: Boolean(whepUrl),
  });
}
