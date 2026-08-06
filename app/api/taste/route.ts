import { NextResponse } from "next/server";
import { getTasteMeta } from "@/lib/anilist";

// Reference data for the titles a visitor already tracks: tags, genres,
// studios and shape. The taste profile itself is built from this in the
// browser — nothing about the resulting preferences is sent back here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 200);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await getTasteMeta(ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
