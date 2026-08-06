import { createHash } from "node:crypto";
import webpush, { WebPushError } from "web-push";
import { getRedis } from "./redis";

export interface PushRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** AniList ids the device wants episode alerts for (its "watching" list). */
  ids: number[];
  /** Minutes before airing to notify. 0 = at air time. */
  lead: number;
  updatedAt: number;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** How long a "already notified" marker sticks around. */
const SENT_TTL = 60 * 60 * 24 * 3;

export const SUBS_INDEX = "push:subs";

export function subKey(id: string): string {
  return `push:sub:${id}`;
}

export function sentKey(id: string, mediaId: number, episode: number): string {
  return `push:sent:${id}:${mediaId}:${episode}`;
}

/** Stable per-device id derived from the endpoint, so re-subscribing upserts. */
export function subId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

let vapidReady = false;

function ensureVapid(): void {
  if (vapidReady) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:noreply@anitrack.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidReady = true;
}

export async function readSub(id: string): Promise<PushRecord | null> {
  const record = await getRedis().get<PushRecord>(subKey(id));
  return record ?? null;
}

export async function writeSub(id: string, record: PushRecord): Promise<void> {
  const redis = getRedis();
  await redis.set(subKey(id), record);
  await redis.sadd(SUBS_INDEX, id);
}

export async function dropSub(id: string): Promise<void> {
  const redis = getRedis();
  await redis.del(subKey(id));
  await redis.srem(SUBS_INDEX, id);
}

/**
 * Claim the right to notify this device about this episode. Returns false if
 * another dispatch already sent it — NX makes overlapping ticks safe.
 */
export async function claimEpisode(
  id: string,
  mediaId: number,
  episode: number,
): Promise<boolean> {
  const result = await getRedis().set(sentKey(id, mediaId, episode), 1, {
    nx: true,
    ex: SENT_TTL,
  });
  return result === "OK";
}

/** Give the claim back after a transient send failure, so the next tick retries. */
export async function releaseEpisode(
  id: string,
  mediaId: number,
  episode: number,
): Promise<void> {
  await getRedis().del(sentKey(id, mediaId, episode));
}

/**
 * Send one notification. Returns false when the subscription is dead (the
 * browser was uninstalled or permission revoked) so the caller can prune it.
 */
export async function sendPush(
  record: PushRecord,
  payload: PushPayload,
): Promise<boolean> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: record.endpoint, keys: record.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return true;
  } catch (error) {
    if (error instanceof WebPushError) {
      // 404/410 mean the push service has permanently dropped the endpoint.
      if (error.statusCode === 404 || error.statusCode === 410) return false;
    }
    throw error;
  }
}
