import { NextResponse } from "next/server";
import { getRelationsForIds } from "@/lib/anilist";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 200);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await getRelationsForIds(ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
