export const revalidate = 86400;

import { NextResponse } from "next/server";
import { getSeason } from "@/lib/anilist";
import { currentSeason, isValidSeason } from "@/lib/season";
import { isValidGenre, isValidFormat, isValidSort } from "@/lib/constants";
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

  const parsedPage = Number(searchParams.get("page"));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const genreParam = searchParams.get("genre") ?? undefined;
  const formatParam = searchParams.get("format") ?? undefined;
  const sortParam = searchParams.get("sort") ?? undefined;
  const genre = isValidGenre(genreParam) ? genreParam : "";
  const format = isValidFormat(formatParam) ? formatParam : "";
  const sort = isValidSort(sortParam) ? sortParam : "";

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    const result = await getSeason(season, year, allowAdult, page, {
      genre: genre || undefined,
      format: format || undefined,
      sort: sort || undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ media: [], total: 0, hasNextPage: false });
  }
}
