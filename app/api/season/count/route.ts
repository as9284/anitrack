export const revalidate = 86400;

import { NextResponse } from "next/server";
import { getSeasonCount } from "@/lib/anilist";
import { currentSeason, isValidSeason } from "@/lib/season";
import { resolveAllowAdult } from "@/lib/adult-server";
import type { MediaSeason } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fallback = currentSeason();

  const seasonParam = searchParams.get("season") ?? undefined;
  const season: MediaSeason = isValidSeason(seasonParam)
    ? seasonParam
    : fallback.season;

  const parsedYear = Number(searchParams.get("year"));
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 1940 && parsedYear <= 2100
      ? parsedYear
      : fallback.year;

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    const count = await getSeasonCount(season, year, allowAdult);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
