import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { liveBroadcastSession } from "@/lib/data";

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
    const session = await liveBroadcastSession(user.id, body.streamId);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start a broadcast session." },
      { status: 400 },
    );
  }
}
