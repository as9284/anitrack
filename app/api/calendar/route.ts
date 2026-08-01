import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/anilist";
import { resolveAllowAdult } from "@/lib/adult-server";
import { nowSeconds } from "@/lib/utils";
import { buildIcs } from "@/lib/ics";
import type { ScheduleItem } from "@/lib/types";

// `resolveAllowAdult` reads cookies, so this can't be statically cached; the
// CDN caching comes from the Cache-Control header below instead.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const WINDOW = 14 * 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = nowSeconds();

  const allowAdult = await resolveAllowAdult(searchParams);

  let items: ScheduleItem[];
  try {
    // 14 days of global airings runs ~250 schedules; 12 pages leaves headroom.
    items = await getSchedule(now, now + WINDOW, allowAdult, 12);
  } catch {
    // Never serve an empty-but-valid calendar on failure — subscribers would
    // treat it as "every episode was cancelled" and wipe the events.
    return new NextResponse("Upstream schedule unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const events = items.map((item) => ({
    uid: `anitrack-schedule-${item.id}@anitrack`,
    start: item.airingAt,
    durationMin: item.media.duration ?? 24,
    summary: `${item.media.title} — Ep ${item.episode}`,
    description: `${SITE_URL}/anime/${item.media.id}`,
    url: `${SITE_URL}/anime/${item.media.id}`,
  }));

  return new NextResponse(buildIcs("AniTrack — Airing", events, now), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="anitrack-airing.ics"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
