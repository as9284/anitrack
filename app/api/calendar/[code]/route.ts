import { NextResponse } from "next/server";
import { getRedis, syncKey, SYNC_CODE_PATTERN } from "@/lib/redis";
import { getScheduleForIds } from "@/lib/anilist";
import { resolveAllowAdult } from "@/lib/adult-server";
import { nowSeconds } from "@/lib/utils";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const WINDOW = 60 * 86400;

interface BlobEntry {
  id?: number;
  status?: string;
}

function unavailable(message: string) {
  // 5xx keeps the subscriber's existing events in place until we recover; a
  // 200 with an empty calendar would delete them.
  return new NextResponse(message, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toLowerCase();
  if (!SYNC_CODE_PATTERN.test(code)) {
    return new NextResponse("Invalid code", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let blob: { entries?: Record<string, BlobEntry> } | null;
  try {
    blob = await getRedis().get(syncKey(code));
  } catch {
    // Redis being down is not the same as "this code doesn't exist".
    return unavailable("Sync storage unavailable");
  }

  if (!blob || typeof blob !== "object" || !blob.entries) {
    return new NextResponse("No list saved under that code", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const ids = [
    ...new Set(
      Object.values(blob.entries)
        .filter((e) => e && e.status === "watching")
        .map((e) => e.id)
        .filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id),
        ),
    ),
  ];

  const allowAdult = await resolveAllowAdult(new URL(request.url).searchParams);

  const now = nowSeconds();
  let airings;
  try {
    airings = await getScheduleForIds(ids, now, now + WINDOW);
  } catch {
    return unavailable("Upstream schedule unavailable");
  }

  const events = airings
    .filter((a) => allowAdult || !a.isAdult)
    .map((a) => ({
      uid: `anitrack-watching-${a.scheduleId}@anitrack`,
      start: a.airingAt,
      durationMin: a.duration ?? 24,
      summary: `${a.title} — Ep ${a.episode}`,
      description: `${SITE_URL}/anime/${a.mediaId}`,
      url: `${SITE_URL}/anime/${a.mediaId}`,
    }));

  return new NextResponse(buildIcs("AniTrack — Watching", events, now), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="anitrack-watching.ics"',
      "Cache-Control": "no-store",
    },
  });
}
