import { NextResponse } from "next/server";
import {
  dropSub,
  pushConfigured,
  subId,
  writeSub,
  type PushRecord,
} from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 200;
const ALLOWED_LEADS = [0, 10, 30, 60, 180, 1440];

interface SubscribeBody {
  subscription?: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  ids?: unknown;
  lead?: unknown;
}

export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((v) => (typeof v === "number" ? v : NaN))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, MAX_IDS)
    : [];

  const lead =
    typeof body.lead === "number" && ALLOWED_LEADS.includes(body.lead)
      ? body.lead
      : 10;

  const record: PushRecord = {
    endpoint,
    keys: { p256dh, auth },
    ids,
    lead,
    updatedAt: Date.now(),
  };

  try {
    await writeSub(subId(endpoint), record);
    return NextResponse.json({ ok: true, count: ids.length });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let endpoint: unknown;
  try {
    ({ endpoint } = (await request.json()) as { endpoint?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  try {
    await dropSub(subId(endpoint));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
  }
}
