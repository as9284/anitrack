import type { DiscoverPlan } from "./taste";
import type { DiscoverCandidate, TasteMeta } from "./types";

// Candidate pools are fetched one term at a time. That's more requests than
// a single "give me recommendations" call, but each URL is a stable cache
// key shared across every visitor, and no single request describes a whole
// person's taste. A pool that fails just thins the page out.
async function getItems<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: T[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export function fetchTasteMeta(ids: number[]): Promise<TasteMeta[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return getItems<TasteMeta>(`/api/taste?ids=${ids.join(",")}`);
}

export function fetchEditorial(): Promise<DiscoverCandidate[]> {
  return getItems<DiscoverCandidate>("/api/discover?mode=editorial");
}

/**
 * AniList allows 30 requests a minute (and drops to that from 90 under load).
 * A full plan is around fifteen pools, so firing them all at once would spend
 * half the minute's budget in one burst and start collecting 429s — which
 * surface as silently empty shelves. Four at a time keeps a cold cache well
 * inside the limit and costs very little wall-clock, since a warm pool
 * returns immediately.
 */
const POOL_CONCURRENCY = 4;

async function mapLimited<T>(
  urls: string[],
  worker: (url: string) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < urls.length; i += POOL_CONCURRENCY) {
    const batch = urls.slice(i, i + POOL_CONCURRENCY);
    const results = await Promise.all(batch.map(worker));
    for (const result of results) out.push(...result);
  }
  return out;
}

export async function fetchPools(
  plan: DiscoverPlan,
): Promise<DiscoverCandidate[]> {
  const url = (mode: string, term: string) =>
    `/api/discover?mode=${mode}&q=${encodeURIComponent(term)}`;

  const urls: string[] = [];
  if (plan.seedIds.length > 0) urls.push(url("recs", plan.seedIds.join(",")));
  for (const tag of plan.tags) urls.push(url("tag", tag));
  for (const genre of plan.genres) urls.push(url("genre", genre));
  for (const genre of plan.gemGenres) urls.push(url("gems", genre));
  for (const studio of plan.studios) urls.push(url("studio", studio));
  for (const genre of plan.blindSpotGenres) urls.push(url("genre", genre));

  return mapLimited(urls, (each) => getItems<DiscoverCandidate>(each));
}
