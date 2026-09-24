import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { heartbeatLiveStream } from "@/lib/data";

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
    await heartbeatLiveStream(user.id, body.streamId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed." },
      { status: 400 },
    );
  }
}
