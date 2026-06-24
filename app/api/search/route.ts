import { NextResponse } from "next/server";
import { searchMedia } from "@/lib/anilist";
import { isValidGenre, isValidFormat } from "@/lib/constants";
import { resolveAllowAdult } from "@/lib/adult-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const genreParam = searchParams.get("genre") ?? undefined;
  const formatParam = searchParams.get("format") ?? undefined;
  const genre = isValidGenre(genreParam) ? genreParam : "";
  const format = isValidFormat(formatParam) ? formatParam : "";

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    const items = await searchMedia(query, allowAdult, {
      genre: genre || undefined,
      format: format || undefined,
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
