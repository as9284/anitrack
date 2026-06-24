import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRecommendations } from "@/lib/anilist";
import { ADULT_COOKIE } from "@/lib/adult";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 50);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const allowAdult = (await cookies()).get(ADULT_COOKIE)?.value === "1";

  try {
    const items = await getRecommendations(ids, allowAdult);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
