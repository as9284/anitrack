import { GENRES } from "./constants";
import type {
  DiscoverCandidate,
  MediaTag,
  TasteMeta,
  WatchStatus,
} from "./types";

/* ------------------------------------------------------------------ *
 * The taste engine.
 *
 * Pure functions, no React and no I/O, so the whole thing runs in the
 * browser against the local watchlist — the profile itself never leaves
 * the device. The only things sent to a route handler are the ids we
 * need reference data for and the individual tag/genre/studio terms
 * used to fetch candidate pools.
 *
 * There are no user ratings in this app, so "liked" has to be inferred
 * from status and progress. Completion is the positive signal; dropping
 * is the negative one, and *where* someone dropped matters — bailing at
 * episode one says far more than quitting a 24-episode show at 20.
 * ------------------------------------------------------------------ */

/** The slice of a watchlist entry the engine needs. */
export interface TasteEntry {
  id: number;
  status: WatchStatus;
  progress: number;
  episodes: number | null;
  title: string;
}

export interface TasteProfile {
  /** L2-normalised preference vectors. Components can be negative. */
  tags: Map<string, number>;
  genres: Map<string, number>;
  studios: Map<string, number>;
  /** Entries that carried a real signal (everything but plan-to-watch). */
  sampleSize: number;
  /** Best-liked titles, strongest first — seeds for crowd recommendations. */
  seeds: TasteEntry[];
  /** Everything already tracked, in any status. Never recommend these. */
  seenIds: Set<number>;
  /** Completed or currently watching — a sequel of one of these is fair game. */
  finishedIds: Set<number>;
  topTags: string[];
  topGenres: string[];
  topStudios: Map<string, number>;
  /** Genres with no exposure at all. */
  blindSpots: string[];
  /** 75th-percentile episode count among finished shows. */
  lengthComfort: number | null;
  /** Tags that show up almost exclusively in things this user abandoned. */
  avoidTags: Set<string>;
  /** True when long series are reliably abandoned rather than finished. */
  dropsLongShows: boolean;
}

/**
 * Cast, demographic and production-technique tags describe almost every
 * show ("Male Protagonist", "Shounen", "CGI"), so they carry very little
 * information about taste. They still count toward similarity scoring,
 * but they're never allowed to name a shelf or drive a candidate query.
 */
const WEAK_TAG_CATEGORIES = new Set([
  "Cast-Main Cast",
  "Demographic",
  "Technical",
]);

/**
 * Sits in Theme-Romance alongside genuinely useful tags like "Love Triangle",
 * but is applied so broadly it describes nothing. Excluded by name since the
 * category it lives in has to stay.
 */
const NOISE_TAGS = new Set(["Heterosexual"]);

/** Not meaningful as "blind spots": Music is mostly MVs, Ecchi is opt-in. */
const BLIND_SPOT_EXCLUDED = new Set(["Music", "Ecchi", "Hentai"]);

const LONG_SERIES = 24;
const SHORT_SERIES = 13;

function isDistinctive(tag: MediaTag): boolean {
  return (
    !tag.spoiler &&
    !NOISE_TAGS.has(tag.name) &&
    !WEAK_TAG_CATEGORIES.has(tag.category ?? "")
  );
}

/**
 * How much a single entry should move the profile, and in which direction.
 * Range is roughly -1 (abandoned immediately) to +1 (finished).
 */
function entryWeight(entry: TasteEntry): number {
  const ratio =
    entry.episodes && entry.episodes > 0
      ? Math.min(1, entry.progress / entry.episodes)
      : null;

  switch (entry.status) {
    case "completed":
      return 1;
    case "watching":
      // Still going is a good sign; deep into a run is a better one.
      return 0.55 + 0.35 * (ratio ?? 0.4);
    case "planning":
      // Intent, not experience. Enough to nudge, not enough to steer.
      return 0.25;
    case "dropped":
      // -1.0 at episode one, easing to -0.45 for a near-complete slog.
      return -1 + 0.55 * (ratio ?? 0.15);
  }
}

function bump(target: Map<string, number>, key: string, amount: number) {
  target.set(key, (target.get(key) ?? 0) + amount);
}

function normalise(vector: Map<string, number>): Map<string, number> {
  let sumSquares = 0;
  for (const value of vector.values()) sumSquares += value * value;
  const norm = Math.sqrt(sumSquares);
  if (norm === 0) return vector;
  const out = new Map<string, number>();
  for (const [key, value] of vector) out.set(key, value / norm);
  return out;
}

/** Both vectors must already be normalised. */
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [key, value] of small) {
    const other = large.get(key);
    if (other !== undefined) dot += value * other;
  }
  return dot;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor(p * (sorted.length - 1) + 0.5),
  );
  return sorted[index];
}

function topKeys(vector: Map<string, number>, count: number): string[] {
  return [...vector.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}

export function buildProfile(
  entries: TasteEntry[],
  meta: TasteMeta[],
): TasteProfile {
  const metaById = new Map(meta.map((m) => [m.id, m]));

  const tags = new Map<string, number>();
  const distinctiveTags = new Map<string, number>();
  const genres = new Map<string, number>();
  const studios = new Map<string, number>();
  const studioCounts = new Map<string, number>();
  const tagPositive = new Map<string, number>();
  const tagNegative = new Map<string, number>();

  const seenIds = new Set<number>();
  const finishedIds = new Set<number>();
  const finishedLengths: number[] = [];
  const weighted: { entry: TasteEntry; weight: number }[] = [];

  let longDropped = 0;
  let longFinished = 0;
  let sampleSize = 0;

  for (const entry of entries) {
    seenIds.add(entry.id);
    if (entry.status === "completed" || entry.status === "watching") {
      finishedIds.add(entry.id);
    }
    if (entry.status === "completed" && entry.episodes) {
      finishedLengths.push(entry.episodes);
      if (entry.episodes >= LONG_SERIES) longFinished += 1;
    }
    if (entry.status === "dropped" && (entry.episodes ?? 0) >= LONG_SERIES) {
      longDropped += 1;
    }

    const info = metaById.get(entry.id);
    if (!info) continue;

    const weight = entryWeight(entry);
    if (entry.status !== "planning") sampleSize += 1;
    weighted.push({ entry, weight });

    for (const tag of info.tags) {
      const contribution = weight * (tag.rank / 100);
      bump(tags, tag.name, contribution);
      if (isDistinctive(tag)) bump(distinctiveTags, tag.name, contribution);
      if (weight > 0) bump(tagPositive, tag.name, weight);
      else bump(tagNegative, tag.name, -weight);
    }
    for (const genre of info.genres) bump(genres, genre, weight);
    for (const studio of info.studios) {
      bump(studios, studio, weight * 0.8);
      if (weight > 0) bump(studioCounts, studio, 1);
    }
  }

  // A tag only counts as something to avoid when the dislike clearly
  // outweighs the liking — one bad show in a favourite genre isn't a veto.
  const avoidTags = new Set<string>();
  for (const [name, negative] of tagNegative) {
    if (negative >= 1.5 && negative > (tagPositive.get(name) ?? 0) * 2) {
      avoidTags.add(name);
    }
  }

  const seeds = weighted
    .filter(({ weight }) => weight >= 0.7)
    .sort((a, b) => b.weight - a.weight)
    .map(({ entry }) => entry);

  const touchedGenres = new Set(
    [...genres.entries()].filter(([, value]) => value !== 0).map(([key]) => key),
  );
  const blindSpots = GENRES.filter(
    (genre) => !touchedGenres.has(genre) && !BLIND_SPOT_EXCLUDED.has(genre),
  );

  const topStudios = new Map(
    [...studioCounts.entries()]
      .filter(([name, count]) => count >= 2 && (studios.get(name) ?? 0) > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4),
  );

  return {
    tags: normalise(tags),
    genres: normalise(genres),
    studios: normalise(studios),
    sampleSize,
    seeds,
    seenIds,
    finishedIds,
    topTags: topKeys(distinctiveTags, 8),
    topGenres: topKeys(genres, 4),
    topStudios,
    blindSpots,
    lengthComfort: percentile(finishedLengths, 0.75),
    avoidTags,
    dropsLongShows: longDropped >= 2 && longDropped > longFinished,
  };
}

/* ------------------------------------------------------------------ *
 * Which pools to fetch
 * ------------------------------------------------------------------ */

export interface DiscoverPlan {
  seedIds: number[];
  tags: string[];
  genres: string[];
  gemGenres: string[];
  studios: string[];
  blindSpotGenres: string[];
}

/** The minimum tracked history before a personalised profile means anything. */
export const COLD_START_THRESHOLD = 5;

export function planPools(profile: TasteProfile): DiscoverPlan {
  return {
    seedIds: profile.seeds.slice(0, 20).map((entry) => entry.id),
    tags: profile.topTags.slice(0, 6),
    genres: profile.topGenres.slice(0, 3),
    gemGenres: profile.topGenres.slice(0, 2),
    studios: [...profile.topStudios.keys()].slice(0, 2),
    blindSpotGenres: profile.blindSpots.slice(0, 1),
  };
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export interface ScoredCandidate {
  candidate: DiscoverCandidate;
  score: number;
  /** Human-readable justifications, strongest first. */
  reasons: string[];
  /** Distinctive tags shared with the profile. */
  matchedTags: string[];
}

function candidateTagVector(candidate: DiscoverCandidate): Map<string, number> {
  const vector = new Map<string, number>();
  for (const tag of candidate.tags) vector.set(tag.name, tag.rank / 100);
  return normalise(vector);
}

function unitVector(keys: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const key of keys) vector.set(key, 1);
  return normalise(vector);
}

/** Rarity, on a log scale — 1.0 for the truly obscure, ~0 for the ubiquitous. */
function novelty(popularity: number | null): number {
  if (popularity === null || popularity <= 0) return 0.6;
  const scaled = Math.log10(popularity) / 6;
  return Math.max(0, Math.min(1, 1 - scaled));
}

function lengthFit(profile: TasteProfile, candidate: DiscoverCandidate): number {
  const cap = profile.lengthComfort;
  if (cap === null || !candidate.episodes) return 0.5;
  if (candidate.episodes <= cap) return 1;
  const over = candidate.episodes / cap;
  return Math.max(0.1, 1 - (over - 1) * 0.5);
}

function formatViewers(popularity: number | null): string {
  if (popularity === null) return "few viewers";
  if (popularity >= 1000) return `${Math.round(popularity / 1000)}k viewers`;
  return `${popularity} viewers`;
}

/**
 * Is this a later season of something the user hasn't started? AniList marks
 * those with a PREQUEL relation; recommending episode 1 of season 3 is noise.
 */
function needsPrequel(
  profile: TasteProfile,
  candidate: DiscoverCandidate,
): boolean {
  if (candidate.prequelIds.length === 0) return false;
  return !candidate.prequelIds.some((id) => profile.finishedIds.has(id));
}

export function scoreCandidate(
  profile: TasteProfile,
  candidate: DiscoverCandidate,
): ScoredCandidate {
  const tagSimilarity = cosine(profile.tags, candidateTagVector(candidate));
  const genreSimilarity = cosine(profile.genres, unitVector(candidate.genres));
  const studioSimilarity = cosine(profile.studios, unitVector(candidate.studios));
  const quality = Math.max(
    0,
    Math.min(1, ((candidate.averageScore ?? 60) - 50) / 40),
  );
  const rarity = novelty(candidate.popularity);
  const fit = lengthFit(profile, candidate);
  const crowd =
    candidate.source === "recs"
      ? Math.min(1, (candidate.crowdRating ?? 0) / 60)
      : 0;

  let score =
    0.42 * tagSimilarity +
    0.18 * genreSimilarity +
    0.08 * studioSimilarity +
    0.12 * quality +
    0.08 * rarity +
    0.06 * fit +
    0.06 * crowd;

  const avoided = candidate.tags.filter((tag) =>
    profile.avoidTags.has(tag.name),
  );
  if (avoided.length > 0) {
    score *= Math.max(0.4, 1 - 0.2 * avoided.length);
  }

  const matchedTags = candidate.tags
    .filter(
      (tag) => isDistinctive(tag) && (profile.tags.get(tag.name) ?? 0) > 0,
    )
    .sort((a, b) => b.rank - a.rank)
    .map((tag) => tag.name);

  const reasons: string[] = [];
  if (matchedTags.length > 0) {
    reasons.push(matchedTags.slice(0, 3).join(" · "));
  }
  const studio = candidate.studios.find((name) => profile.topStudios.has(name));
  if (studio) {
    reasons.push(`${studio}, a studio you keep coming back to`);
  }
  if (candidate.source === "gems" && candidate.averageScore) {
    reasons.push(
      `Rated ${candidate.averageScore} with only ${formatViewers(candidate.popularity)}`,
    );
  }
  if (profile.dropsLongShows && candidate.episodes && candidate.episodes <= SHORT_SERIES) {
    reasons.push(`${candidate.episodes} episodes`);
  }

  return { candidate, score, reasons, matchedTags };
}

/**
 * Drop everything already tracked, plus sequels to series the user hasn't
 * started, then score and rank what's left. Candidates arriving from several
 * pools are merged, keeping the highest-scoring attribution.
 */
export function rankCandidates(
  profile: TasteProfile,
  candidates: DiscoverCandidate[],
): ScoredCandidate[] {
  const best = new Map<number, ScoredCandidate>();

  for (const candidate of candidates) {
    if (profile.seenIds.has(candidate.id)) continue;
    if (needsPrequel(profile, candidate)) continue;

    const scored = scoreCandidate(profile, candidate);
    const existing = best.get(candidate.id);
    if (!existing || scored.score > existing.score) {
      best.set(candidate.id, scored);
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ *
 * Shelves
 * ------------------------------------------------------------------ */

export interface Shelf {
  key: string;
  title: string;
  /** Why this shelf exists — shown to the user, never generic filler. */
  reason: string;
  items: ScoredCandidate[];
}

const MIN_SHELF_ITEMS = 4;
const MAX_SHELF_ITEMS = 8;

export function joinList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

/**
 * Shelves claim titles in priority order, so nothing appears twice and the
 * most specific explanation wins. A shelf that can't fill up is dropped
 * rather than padded — an unexplained row is worse than no row.
 */
export function buildShelves(
  profile: TasteProfile,
  ranked: ScoredCandidate[],
): Shelf[] {
  const used = new Set<number>();
  const shelves: Shelf[] = [];

  const take = (
    pool: ScoredCandidate[],
    limit = MAX_SHELF_ITEMS,
  ): ScoredCandidate[] => {
    const picked: ScoredCandidate[] = [];
    for (const item of pool) {
      if (used.has(item.candidate.id)) continue;
      picked.push(item);
      if (picked.length >= limit) break;
    }
    return picked;
  };

  const commit = (shelf: Shelf) => {
    if (shelf.items.length < MIN_SHELF_ITEMS) return;
    for (const item of shelf.items) used.add(item.candidate.id);
    shelves.push(shelf);
  };

  // 1. Crowd recommendations, attributed to the specific show that earned them.
  for (const seed of profile.seeds.slice(0, 3)) {
    const pool = ranked.filter(
      (item) =>
        item.candidate.source === "recs" &&
        item.candidate.sourceTerm === String(seed.id),
    );
    const verb = seed.status === "completed" ? "finished" : "started";
    commit({
      key: `because-${seed.id}`,
      title: `Because you ${verb} ${seed.title}`,
      reason: `Ranked by how strongly AniList readers pair these with ${seed.title}.`,
      items: take(pool, 6),
    });
  }

  // 2. The recurring themes across the whole list, named explicitly.
  if (profile.topTags.length > 0) {
    const named = profile.topTags.slice(0, 3);
    commit({
      key: "threads",
      title: "Threads you keep pulling",
      reason: `Your list leans hard on ${joinList(named)}.`,
      items: take(ranked.filter((item) => item.candidate.source === "tag")),
    });
  }

  // 3. Studios, but only where there's a real pattern (2+ finished titles).
  for (const [studio, count] of profile.topStudios) {
    const pool = ranked.filter(
      (item) =>
        item.candidate.source === "studio" &&
        item.candidate.studios.includes(studio),
    );
    commit({
      key: `studio-${studio}`,
      title: `More from ${studio}`,
      reason: `You've tracked ${count} of their titles.`,
      items: take(pool, 6),
    });
  }

  // 4. Quality that popularity buried.
  commit({
    key: "gems",
    title: "Hidden gems",
    reason:
      "Highly rated in your genres, but almost nobody has watched them.",
    items: take(ranked.filter((item) => item.candidate.source === "gems")),
  });

  // 5. Only worth saying when the list actually shows the pattern.
  if (profile.dropsLongShows) {
    const pool = ranked.filter(
      (item) =>
        item.candidate.episodes !== null &&
        item.candidate.episodes <= SHORT_SERIES,
    );
    commit({
      key: "short",
      title: "Short enough to actually finish",
      reason: `You tend to abandon long runs, so nothing here is over ${SHORT_SERIES} episodes.`,
      items: take(pool, 6),
    });
  }

  // 6. The deliberate anti-echo-chamber shelf.
  for (const genre of profile.blindSpots.slice(0, 1)) {
    const pool = ranked.filter(
      (item) =>
        item.candidate.source === "genre" &&
        item.candidate.sourceTerm === genre,
    );
    commit({
      key: `blindspot-${genre}`,
      title: `Your blind spot: ${genre}`,
      reason: `You've never tracked a ${genre} title. These are the ones worth breaking that with.`,
      items: take(pool, 6),
    });
  }

  // 7. Whatever scored well without fitting a story above.
  commit({
    key: "overall",
    title: "Closest to your taste overall",
    reason: `Scored against every show in your list — ${profile.sampleSize} of them carried a signal.`,
    items: take(ranked),
  });

  return shelves;
}

/**
 * Cold-start shelves: no profile, so the reasons are honest about that.
 * The prequel rule matters more here than anywhere — telling someone with an
 * empty list to start on season three is the fastest way to look stupid.
 */
export function buildEditorialShelves(
  candidates: DiscoverCandidate[],
  seenIds: Set<number>,
): Shelf[] {
  const wrap = (item: DiscoverCandidate): ScoredCandidate => ({
    candidate: item,
    score: 0,
    reasons: item.averageScore ? [`Rated ${item.averageScore}`] : [],
    matchedTags: [],
  });

  const pick = (term: string, limit: number) =>
    candidates
      .filter(
        (item) =>
          item.sourceTerm === term &&
          !seenIds.has(item.id) &&
          !item.prequelIds.some((id) => !seenIds.has(id)),
      )
      .slice(0, limit)
      .map(wrap);

  return [
    {
      key: "editorial-greats",
      title: "The ones everyone starts with",
      reason: "Highest rated among the most widely watched anime.",
      items: pick("greats", 8),
    },
    {
      key: "editorial-seasonal",
      title: "Airing now, safe to start cold",
      reason:
        "Currently airing and ranked by score, with anything that needs an earlier season left out.",
      items: pick("seasonal", 8),
    },
    {
      key: "editorial-gems",
      title: "Hidden gems",
      reason: "Exceptional scores, barely any audience.",
      items: pick("gems", 8),
    },
  ].filter((shelf) => shelf.items.length >= MIN_SHELF_ITEMS);
}
