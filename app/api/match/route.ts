import { NextResponse } from "next/server";
import { matchTitles } from "@/lib/anilist";
import { resolveAllowAdult } from "@/lib/adult-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  let body: { titles?: unknown };
  try {
    body = (await request.json()) as { titles?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = Array.isArray(body.titles) ? body.titles : [];
  const titles = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 50);

  if (titles.length === 0) {
    return NextResponse.json({ error: "No titles provided" }, { status: 400 });
  }

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    const matches = await matchTitles(titles, allowAdult);
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach AniList. Please try again." },
      { status: 502 },
    );
  }
}
