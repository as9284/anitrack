import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/anilist";
import { resolveAllowAdult } from "@/lib/adult-server";
import { nowSeconds } from "@/lib/utils";

const MAX_WINDOW = 14 * 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = nowSeconds();

  const parsedStart = Number(searchParams.get("start"));
  const start =
    Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : now;

  const parsedEnd = Number(searchParams.get("end"));
  const requestedEnd =
    Number.isFinite(parsedEnd) && parsedEnd > start
      ? parsedEnd
      : start + 7 * 86400;
  const end = Math.min(requestedEnd, start + MAX_WINDOW);

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    const items = await getSchedule(start, end, allowAdult);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
