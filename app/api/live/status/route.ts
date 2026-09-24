import { NextResponse } from "next/server";
import { getLiveStreamPage } from "@/lib/data";

export async function GET(request: Request) {
  const streamId = new URL(request.url).searchParams.get("id");
  if (!streamId) {
    return NextResponse.json({ error: "Missing live report." }, { status: 400 });
  }
  const page = await getLiveStreamPage(streamId);
  if (!page) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    status: page.status,
    playbackUrl: page.playbackUrl,
    playbackKind: page.playbackKind,
    reportId: page.reportId,
  });
}
