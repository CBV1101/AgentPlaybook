import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markLiveStreamStatus } from "@/lib/data";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to go live." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { streamId?: string } | null;
  if (!body?.streamId) {
    return NextResponse.json({ error: "Missing live report." }, { status: 400 });
  }
  try {
    await markLiveStreamStatus(user.id, body.streamId, "failed");
    return NextResponse.json({ status: "failed" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not mark the stream failed." },
      { status: 400 },
    );
  }
}
