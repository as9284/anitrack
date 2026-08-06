import { NextResponse } from "next/server";
import { dropSub, pushConfigured, readSub, sendPush, subId } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  let endpoint: unknown;
  try {
    ({ endpoint } = (await request.json()) as { endpoint?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const id = subId(endpoint);
  const record = await readSub(id);
  if (!record) {
    return NextResponse.json({ error: "Not subscribed" }, { status: 404 });
  }

  try {
    const delivered = await sendPush(record, {
      title: "AniTrack",
      body: "Notifications are working. This is what an episode alert looks like.",
      url: "/",
      tag: "anitrack-test",
    });
    if (!delivered) {
      await dropSub(id);
      return NextResponse.json({ error: "Subscription expired" }, { status: 410 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
