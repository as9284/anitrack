import { NextResponse } from "next/server";
import { getRedis, syncKey, SYNC_CODE_PATTERN } from "@/lib/redis";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { code: rawCode } = await params;
  const code = rawCode.toLowerCase();
  if (!SYNC_CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const data = await getRedis().get(syncKey(code));
    if (data === null || data === undefined) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Sync unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { code: rawCode } = await params;
  const code = rawCode.toLowerCase();
  if (!SYNC_CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await getRedis().set(syncKey(code), body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sync unavailable" }, { status: 500 });
  }
}
