import { NextResponse } from "next/server";
import { getMetaForIds } from "@/lib/anilist";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 300);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await getMetaForIds(ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
