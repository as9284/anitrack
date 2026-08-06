import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getAiringForNotify } from "@/lib/anilist";
import { getRedis } from "@/lib/redis";
import {
  SUBS_INDEX,
  claimEpisode,
  dropSub,
  pushConfigured,
  readSub,
  releaseEpisode,
  sendPush,
  type PushRecord,
} from "@/lib/push";
import type { NotifyMedia } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Don't fire for an episode that aired more than this long ago. */
const LATE_GRACE = 60 * 60;
const BATCH = 50;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function describe(episode: number, minutesOut: number): string {
  if (minutesOut <= 0) return `Episode ${episode} is airing now.`;
  if (minutesOut < 60) return `Episode ${episode} airs in ${minutesOut} min.`;
  const hours = Math.round(minutesOut / 60);
  if (hours < 24)
    return `Episode ${episode} airs in ${hours} hour${hours === 1 ? "" : "s"}.`;
  const days = Math.round(hours / 24);
  return `Episode ${episode} airs in ${days} day${days === 1 ? "" : "s"}.`;
}

async function verifyQStash(request: Request, body: string): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) return false;

  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;

  try {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!(await verifyQStash(request, raw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const redis = getRedis();
  const ids = await redis.smembers(SUBS_INDEX);
  if (ids.length === 0) {
    return NextResponse.json({ subscribers: 0, sent: 0 });
  }

  const records = await Promise.all(ids.map((id) => readSub(id)));
  const subs: { id: string; record: PushRecord }[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const record = records[i];
    // Index entry with no record behind it — clean it up.
    if (!record) {
      await redis.srem(SUBS_INDEX, ids[i]);
      continue;
    }
    if (record.ids.length > 0) subs.push({ id: ids[i], record });
  }

  const tracked = [...new Set(subs.flatMap((s) => s.record.ids))];
  const media = new Map<number, NotifyMedia>();
  for (const group of chunk(tracked, BATCH)) {
    const results = await getAiringForNotify(group);
    for (const item of results) media.set(item.id, item);
  }

  const now = Math.floor(Date.now() / 1000);
  let sent = 0;
  let pruned = 0;

  for (const { id, record } of subs) {
    let alive = true;
    for (const mediaId of record.ids) {
      if (!alive) break;
      const item = media.get(mediaId);
      const next = item?.nextAiringEpisode;
      if (!item || !next) continue;

      const fireAt = next.airingAt - record.lead * 60;
      if (now < fireAt || now > next.airingAt + LATE_GRACE) continue;

      // NX claim: overlapping ticks can't double-send the same episode.
      if (!(await claimEpisode(id, mediaId, next.episode))) continue;

      const minutesOut = Math.round((next.airingAt - now) / 60);
      let outcome: "sent" | "dead" | "failed";
      try {
        outcome = (await sendPush(record, {
          title: item.title,
          body: describe(next.episode, minutesOut),
          url: `/anime/${mediaId}`,
          tag: `ep-${mediaId}-${next.episode}`,
        }))
          ? "sent"
          : "dead";
      } catch {
        outcome = "failed";
      }

      if (outcome === "sent") {
        sent += 1;
      } else if (outcome === "dead") {
        await dropSub(id);
        pruned += 1;
        alive = false;
      } else {
        // Transient: hand the claim back so the next tick tries again.
        await releaseEpisode(id, mediaId, next.episode);
      }
    }
  }

  return NextResponse.json({ subscribers: subs.length, sent, pruned });
}
