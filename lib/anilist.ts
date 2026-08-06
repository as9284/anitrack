import { currentSeason } from "./season";
import { stripHtml } from "./utils";
import type {
  AiringStatus,
  DiscoverCandidate,
  DiscoverSource,
  ImportEntry,
  MediaCard,
  MediaDetail,
  MediaMeta,
  MediaSeason,
  MediaTag,
  NotifyMedia,
  ScheduleItem,
  TasteMeta,
  WatchStatus,
} from "./types";

const ENDPOINT = "https://graphql.anilist.co";

interface RawTitle {
  romaji: string | null;
  english: string | null;
  native?: string | null;
}

interface RawCover {
  large: string | null;
  extraLarge?: string | null;
  color: string | null;
}

interface RawAiring {
  airingAt: number;
  episode: number;
}

interface RawMedia {
  id: number;
  title: RawTitle;
  coverImage: RawCover;
  bannerImage?: string | null;
  format: string | null;
  episodes: number | null;
  averageScore: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  genres: string[];
  season?: string | null;
  seasonYear: number | null;
  status?: string | null;
  duration?: number | null;
  description?: string | null;
  nextAiringEpisode: RawAiring | null;
  isAdult: boolean;
  studios?: { nodes: { name: string }[] };
  tags?: {
    name: string;
    rank: number | null;
    category?: string | null;
    isGeneralSpoiler: boolean;
  }[];
  trailer?: { id: string; site: string; thumbnail: string | null } | null;
  externalLinks?: {
    site: string;
    url: string;
    color: string | null;
    type: string | null;
  }[];
  relations?: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: RawTitle;
        coverImage: RawCover;
        format: string | null;
        episodes: number | null;
        type: string;
      };
    }[];
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function aniFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  revalidate: number,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`AniList request failed (${res.status})`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) {
    throw new Error("AniList returned no data");
  }
  return json.data;
}

function pickTitle(title: RawTitle): string {
  return title.english ?? title.romaji ?? title.native ?? "Untitled";
}

function pickCover(cover: RawCover): string {
  return cover.extraLarge ?? cover.large ?? "";
}

function mapCard(m: RawMedia): MediaCard {
  return {
    id: m.id,
    title: pickTitle(m.title),
    cover: pickCover(m.coverImage),
    color: m.coverImage.color,
    format: m.format,
    episodes: m.episodes,
    duration: m.duration ?? null,
    averageScore: m.averageScore,
    genres: m.genres ?? [],
    nextAiringEpisode: m.nextAiringEpisode
      ? {
          airingAt: m.nextAiringEpisode.airingAt,
          episode: m.nextAiringEpisode.episode,
        }
      : null,
    isAdult: m.isAdult,
    seasonYear: m.seasonYear,
  };
}

function mapDetail(m: RawMedia): MediaDetail {
  return {
    ...mapCard(m),
    banner: m.bannerImage ?? null,
    description: stripHtml(m.description),
    native: m.title.native ?? null,
    duration: m.duration ?? null,
    status: m.status ?? null,
    season: (m.season as MediaSeason | null) ?? null,
    studios: m.studios?.nodes.map((s) => s.name) ?? [],
    meanScore: m.meanScore ?? null,
    popularity: m.popularity ?? null,
    trailer: m.trailer ?? null,
    externalLinks:
      m.externalLinks?.map((l) => ({
        site: l.site,
        url: l.url,
        color: l.color,
        type: l.type,
      })) ?? [],
    relations:
      m.relations?.edges
        .filter((e) => e.node.type === "ANIME")
        .map((e) => ({
          relationType: e.relationType,
          id: e.node.id,
          title: pickTitle(e.node.title),
          cover: pickCover(e.node.coverImage),
          format: e.node.format,
          episodes: e.node.episodes,
        })) ?? [],
  };
}

const CARD_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge color }
  format
  episodes
  duration
  averageScore
  genres
  seasonYear
  isAdult
  nextAiringEpisode { airingAt episode }
`;

export interface SeasonResult {
  media: MediaCard[];
  total: number;
  hasNextPage: boolean;
}

export interface BrowseFilters {
  genre?: string;
  format?: string;
  sort?: string;
}

function filterClause(filters: BrowseFilters): string {
  const genre = filters.genre
    ? `, genre_in: [${JSON.stringify(filters.genre)}]`
    : "";
  const format = filters.format ? `, format: ${filters.format}` : "";
  return `${genre}${format}`;
}

export async function getSeason(
  season: MediaSeason,
  year: number,
  allowAdult: boolean,
  page = 1,
  filters: BrowseFilters = {},
): Promise<SeasonResult> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const sort = filters.sort ?? "POPULARITY_DESC";
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int) {
      Page(page: $page, perPage: 30) {
        pageInfo { total hasNextPage }
        media(season: $season, seasonYear: $year, type: ANIME, sort: ${sort}${filterClause(filters)}${adultFilter}) {
          ${CARD_FIELDS}
        }
      }
    }
  `;
  const data = await aniFetch<{
    Page: {
      pageInfo: { total: number; hasNextPage: boolean };
      media: RawMedia[];
    };
  }>(query, { season, year, page }, 86400);

  return {
    media: data.Page.media.map(mapCard),
    total: data.Page.pageInfo.total,
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

// AniList's pageInfo.total is capped at 5000 and unreliable for season
// queries, so count by paginating ids (~2 requests per season) instead.
export async function getSeasonCount(
  season: MediaSeason,
  year: number,
  allowAdult: boolean,
): Promise<number> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        media(season: $season, seasonYear: $year, type: ANIME${adultFilter}) {
          id
        }
      }
    }
  `;
  let count = 0;
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await aniFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: { id: number }[] };
    }>(query, { season, year, page }, 86400);
    count += data.Page.media.length;
    hasNextPage = data.Page.pageInfo.hasNextPage;
    page += 1;
  }
  return count;
}

export async function getSchedule(
  start: number,
  end: number,
  allowAdult: boolean,
  maxPages = 6,
): Promise<ScheduleItem[]> {
  const query = `
    query ($start: Int, $end: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id
          airingAt
          episode
          media {
            ${CARD_FIELDS}
          }
        }
      }
    }
  `;

  const items: ScheduleItem[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= maxPages) {
    const data = await aniFetch<{
      Page: {
        pageInfo: { hasNextPage: boolean };
        airingSchedules: {
          id: number;
          airingAt: number;
          episode: number;
          media: RawMedia;
        }[];
      };
    }>(query, { start, end, page }, 3600);

    for (const s of data.Page.airingSchedules) {
      if (!s.media) continue;
      if (!allowAdult && s.media.isAdult) continue;
      items.push({
        id: s.id,
        airingAt: s.airingAt,
        episode: s.episode,
        media: mapCard(s.media),
      });
    }

    hasNext = data.Page.pageInfo.hasNextPage;
    page += 1;
  }

  return items;
}

export async function getMedia(id: number): Promise<MediaDetail | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${CARD_FIELDS}
        meanScore
        popularity
        duration
        status
        season
        bannerImage
        description(asHtml: false)
        studios(isMain: true) { nodes { name } }
        trailer { id site thumbnail }
        externalLinks { site url color type }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              episodes
              title { romaji english native }
              coverImage { large extraLarge color }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await aniFetch<{ Media: RawMedia | null }>(
      query,
      { id },
      21600,
    );
    return data.Media ? mapDetail(data.Media) : null;
  } catch {
    return null;
  }
}

export async function searchMedia(
  term: string,
  allowAdult: boolean,
  filters: BrowseFilters = {},
): Promise<MediaCard[]> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 30) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH${filterClause(filters)}${adultFilter}) {
          ${CARD_FIELDS}
        }
      }
    }
  `;
  const data = await aniFetch<{ Page: { media: RawMedia[] } }>(
    query,
    { search: term },
    60,
  );
  return data.Page.media.map(mapCard);
}

export interface TitleMatch {
  query: string;
  candidates: MediaCard[];
}

export async function matchTitles(
  titles: string[],
  allowAdult: boolean,
): Promise<TitleMatch[]> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH${adultFilter}) {
          ${CARD_FIELDS}
        }
      }
    }
  `;
  const out: TitleMatch[] = [];
  for (const term of titles) {
    try {
      const data = await aniFetch<{ Page: { media: RawMedia[] } }>(
        query,
        { search: term },
        60,
      );
      out.push({ query: term, candidates: data.Page.media.map(mapCard) });
    } catch {
      out.push({ query: term, candidates: [] });
    }
  }
  return out;
}

export async function getAiringForIds(ids: number[]): Promise<AiringStatus[]> {
  if (ids.length === 0) return [];
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          status
          episodes
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `;
  const data = await aniFetch<{
    Page: {
      media: {
        id: number;
        status: string | null;
        episodes: number | null;
        nextAiringEpisode: RawAiring | null;
      }[];
    };
  }>(query, { ids: ids.slice(0, 50) }, 1800);

  return data.Page.media.map((m) => ({
    id: m.id,
    status: m.status,
    episodes: m.episodes,
    nextAiringEpisode: m.nextAiringEpisode
      ? {
          airingAt: m.nextAiringEpisode.airingAt,
          episode: m.nextAiringEpisode.episode,
        }
      : null,
  }));
}

/**
 * Airing data plus the bits a notification needs to render (title, cover).
 * Cached for 5 minutes — the notification dispatcher runs on that cadence.
 */
export async function getAiringForNotify(
  ids: number[],
): Promise<NotifyMedia[]> {
  if (ids.length === 0) return [];
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          title { romaji english native }
          coverImage { large extraLarge color }
          episodes
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `;
  const data = await aniFetch<{
    Page: {
      media: {
        id: number;
        title: RawTitle;
        coverImage: RawCover;
        episodes: number | null;
        nextAiringEpisode: RawAiring | null;
      }[];
    };
  }>(query, { ids: ids.slice(0, 50) }, 300);

  return data.Page.media.map((m) => ({
    id: m.id,
    title: pickTitle(m.title),
    cover: pickCover(m.coverImage),
    episodes: m.episodes,
    nextAiringEpisode: m.nextAiringEpisode
      ? {
          airingAt: m.nextAiringEpisode.airingAt,
          episode: m.nextAiringEpisode.episode,
        }
      : null,
  }));
}

function mapAniListStatus(status: string): WatchStatus {
  switch (status) {
    case "CURRENT":
    case "REPEATING":
      return "watching";
    case "COMPLETED":
      return "completed";
    case "DROPPED":
    case "PAUSED":
      return "dropped";
    default:
      return "planning";
  }
}

export async function importFromAniList(
  userName: string,
): Promise<ImportEntry[]> {
  const query = `
    query ($name: String) {
      MediaListCollection(userName: $name, type: ANIME) {
        lists {
          entries {
            status
            progress
            media {
              id
              title { romaji english native }
              coverImage { large extraLarge color }
              episodes
              format
            }
          }
        }
      }
    }
  `;
  const data = await aniFetch<{
    MediaListCollection: {
      lists: {
        entries: {
          status: string;
          progress: number | null;
          media: RawMedia | null;
        }[];
      }[];
    } | null;
  }>(query, { name: userName }, 0);

  const out: ImportEntry[] = [];
  const seen = new Set<number>();
  for (const list of data.MediaListCollection?.lists ?? []) {
    for (const entry of list.entries) {
      const media = entry.media;
      if (!media || seen.has(media.id)) continue;
      seen.add(media.id);
      out.push({
        id: media.id,
        status: mapAniListStatus(entry.status),
        progress: entry.progress ?? 0,
        title: pickTitle(media.title),
        cover: pickCover(media.coverImage),
        episodes: media.episodes,
        format: media.format,
      });
    }
  }
  return out;
}

export async function getRecommendations(
  ids: number[],
  allowAdult: boolean,
): Promise<MediaCard[]> {
  if (ids.length === 0) return [];
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          recommendations(sort: RATING_DESC, perPage: 8) {
            nodes { mediaRecommendation { ${CARD_FIELDS} } }
          }
        }
      }
    }
  `;
  const data = await aniFetch<{
    Page: {
      media: {
        recommendations: {
          nodes: { mediaRecommendation: RawMedia | null }[];
        };
      }[];
    };
  }>(query, { ids: ids.slice(0, 50) }, 3600);

  const exclude = new Set(ids);
  const ranked = new Map<number, { card: MediaCard; score: number }>();
  for (const media of data.Page.media) {
    for (const node of media.recommendations?.nodes ?? []) {
      const rec = node.mediaRecommendation;
      if (!rec || exclude.has(rec.id)) continue;
      if (!allowAdult && rec.isAdult) continue;
      const existing = ranked.get(rec.id);
      if (existing) existing.score += 1;
      else ranked.set(rec.id, { card: mapCard(rec), score: 1 });
    }
  }

  return [...ranked.values()]
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.card);
}

export interface CalendarAiring {
  scheduleId: number;
  airingAt: number;
  episode: number;
  mediaId: number;
  title: string;
  duration: number | null;
  isAdult: boolean;
}

export async function getScheduleForIds(
  ids: number[],
  start: number,
  end: number,
): Promise<CalendarAiring[]> {
  const query = `
    query ($ids: [Int], $start: Int, $end: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        airingSchedules(mediaId_in: $ids, airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id
          airingAt
          episode
          media {
            id
            title { romaji english }
            duration
            isAdult
          }
        }
      }
    }
  `;

  if (ids.length === 0) return [];

  const out: CalendarAiring[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    let page = 1;
    let hasNext = true;
    // A failure here propagates on purpose: serving a partial calendar would
    // make subscribers delete the episodes we failed to fetch.
    while (hasNext && page <= 10) {
      const data = await aniFetch<{
        Page: {
          pageInfo: { hasNextPage: boolean };
          airingSchedules: {
            id: number;
            airingAt: number;
            episode: number;
            media: {
              id: number;
              title: RawTitle;
              duration: number | null;
              isAdult: boolean;
            } | null;
          }[];
        };
      }>(query, { ids: chunk, start, end, page }, 3600);
      for (const s of data.Page.airingSchedules) {
        if (!s.media) continue;
        out.push({
          scheduleId: s.id,
          airingAt: s.airingAt,
          episode: s.episode,
          mediaId: s.media.id,
          title: pickTitle(s.media.title),
          duration: s.media.duration ?? null,
          isAdult: s.media.isAdult,
        });
      }
      hasNext = data.Page.pageInfo.hasNextPage;
      page += 1;
    }
  }
  return out;
}

export interface RelationLinks {
  id: number;
  neighbors: number[];
}

// Sequel/prequel timeline links for the tracked ids, used to group seasons of
// the same series. Deliberately limited to SEQUEL/PREQUEL (not SIDE_STORY /
// SPIN_OFF / ALTERNATIVE) so franchises don't over-merge. Neighbor ids may be
// untracked middle seasons — that's fine, they connect tracked seasons via a
// shared id in the client-side union-find.
export async function getRelationsForIds(
  ids: number[],
): Promise<RelationLinks[]> {
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          relations {
            edges {
              relationType
              node { id type }
            }
          }
        }
      }
    }
  `;

  const out: RelationLinks[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const data = await aniFetch<{
        Page: {
          media: {
            id: number;
            relations: {
              edges: {
                relationType: string;
                node: { id: number; type: string };
              }[];
            } | null;
          }[];
        };
      }>(query, { ids: chunk }, 86400);

      for (const m of data.Page.media) {
        const neighbors = (m.relations?.edges ?? [])
          .filter(
            (e) =>
              (e.relationType === "SEQUEL" || e.relationType === "PREQUEL") &&
              e.node.type === "ANIME",
          )
          .map((e) => e.node.id);
        out.push({ id: m.id, neighbors });
      }
    } catch {
      // On failure, leave these ids ungrouped rather than breaking the page.
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Discover
 *
 * Two AniList gotchas drive the shape of everything below:
 *
 *  1. `tag_in` / `genre_in` are AND, not OR — `tag_in: ["Time Loop",
 *     "Iyashikei"]` matches titles carrying *both* and returns nothing.
 *     So every pool is fetched one term at a time with the singular
 *     `tag:` / `genre:` args. That's more requests, but each one is a
 *     stable, profile-independent cache key shared by every visitor,
 *     which is also what keeps the user's taste off the server.
 *
 *  2. `Media.tags` takes no `sort` argument; it already comes back
 *     rank-descending.
 * ------------------------------------------------------------------ */

/** Below this rank a tag is noise — a handful of stray user votes. */
const MIN_TAG_RANK = 50;

const CANDIDATE_FIELDS = `
  ${CARD_FIELDS}
  popularity
  status
  studios(isMain: true) { nodes { name } }
  tags { name rank category isGeneralSpoiler }
  relations { edges { relationType node { id type } } }
`;

function mapTags(m: RawMedia): MediaTag[] {
  return (m.tags ?? [])
    .filter((t) => (t.rank ?? 0) >= MIN_TAG_RANK)
    .map((t) => ({
      name: t.name,
      rank: t.rank ?? 0,
      category: t.category ?? null,
      spoiler: t.isGeneralSpoiler,
    }));
}

function mapPrequels(m: RawMedia): number[] {
  return (m.relations?.edges ?? [])
    .filter((e) => e.relationType === "PREQUEL" && e.node.type === "ANIME")
    .map((e) => e.node.id);
}

function mapCandidate(
  m: RawMedia,
  source: DiscoverSource,
  sourceTerm: string,
  crowdRating: number | null = null,
): DiscoverCandidate {
  return {
    ...mapCard(m),
    popularity: m.popularity ?? null,
    status: m.status ?? null,
    studios: m.studios?.nodes.map((s) => s.name) ?? [],
    tags: mapTags(m),
    prequelIds: mapPrequels(m),
    source,
    sourceTerm,
    crowdRating,
  };
}

export type DiscoverMode = "tag" | "genre" | "gems" | "studio";

/**
 * One candidate pool for one term. `gems` restricts to well-reviewed titles
 * hardly anyone has seen — that's the whole point of the shelf, so the
 * popularity ceiling is deliberately aggressive.
 */
export async function discoverPool(
  mode: Exclude<DiscoverMode, "studio">,
  term: string,
  allowAdult: boolean,
): Promise<DiscoverCandidate[]> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const selector =
    mode === "tag" ? "tag: $term, minimumTagRank: 55" : "genre: $term";
  const quality =
    mode === "gems"
      ? "averageScore_greater: 74, popularity_lesser: 60000"
      : "averageScore_greater: 62";

  const query = `
    query ($term: String) {
      Page(page: 1, perPage: 24) {
        media(
          type: ANIME
          ${selector}
          ${quality}
          sort: SCORE_DESC
          format_not_in: [MUSIC]
          ${adultFilter}
        ) {
          ${CANDIDATE_FIELDS}
        }
      }
    }
  `;

  const source: DiscoverSource = mode === "gems" ? "gems" : mode;
  const data = await aniFetch<{ Page: { media: RawMedia[] } }>(
    query,
    { term },
    86400,
  );
  return data.Page.media.map((m) => mapCandidate(m, source, term));
}

export async function discoverByStudio(
  name: string,
  allowAdult: boolean,
): Promise<DiscoverCandidate[]> {
  const query = `
    query ($name: String) {
      Studio(search: $name) {
        name
        media(sort: SCORE_DESC, isMain: true, perPage: 20) {
          nodes { ${CANDIDATE_FIELDS} }
        }
      }
    }
  `;
  const data = await aniFetch<{
    Studio: { name: string; media: { nodes: RawMedia[] } } | null;
  }>(query, { name }, 86400);

  const studio = data.Studio;
  if (!studio) return [];
  // Studio.media has no isAdult argument, so filter after mapping.
  return studio.media.nodes
    .filter((m) => allowAdult || !m.isAdult)
    .filter((m) => m.format !== "MUSIC")
    .map((m) => mapCandidate(m, "studio", studio.name));
}

/**
 * AniList's crowd recommendations, kept attributed to the seed that produced
 * them so the UI can say "because you finished X" and mean it.
 */
export async function discoverRecs(
  ids: number[],
  allowAdult: boolean,
): Promise<DiscoverCandidate[]> {
  if (ids.length === 0) return [];
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          recommendations(sort: RATING_DESC, perPage: 10) {
            nodes {
              rating
              mediaRecommendation { ${CANDIDATE_FIELDS} }
            }
          }
        }
      }
    }
  `;
  const data = await aniFetch<{
    Page: {
      media: {
        id: number;
        recommendations: {
          nodes: {
            rating: number | null;
            mediaRecommendation: RawMedia | null;
          }[];
        } | null;
      }[];
    };
  }>(query, { ids: ids.slice(0, 50) }, 21600);

  // Keep one entry per recommended title, attributed to its strongest seed.
  const best = new Map<number, DiscoverCandidate>();
  for (const seed of data.Page.media) {
    for (const node of seed.recommendations?.nodes ?? []) {
      const rec = node.mediaRecommendation;
      if (!rec) continue;
      if (!allowAdult && rec.isAdult) continue;
      if (rec.format === "MUSIC") continue;
      const rating = node.rating ?? 0;
      const existing = best.get(rec.id);
      if (existing && (existing.crowdRating ?? 0) >= rating) continue;
      best.set(rec.id, mapCandidate(rec, "recs", String(seed.id), rating));
    }
  }
  return [...best.values()];
}

/**
 * Cold-start pools — no profile involved, so this is one globally cached
 * request. `sourceTerm` names the shelf each title belongs to.
 */
export async function discoverEditorial(
  allowAdult: boolean,
): Promise<DiscoverCandidate[]> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const { season, year } = currentSeason();
  const query = `
    query ($season: MediaSeason, $year: Int) {
      greats: Page(page: 1, perPage: 40) {
        media(type: ANIME, sort: SCORE_DESC, popularity_greater: 150000, format_not_in: [MUSIC]${adultFilter}) {
          ${CANDIDATE_FIELDS}
        }
      }
      seasonal: Page(page: 1, perPage: 40) {
        media(type: ANIME, season: $season, seasonYear: $year, sort: SCORE_DESC, format_not_in: [MUSIC]${adultFilter}) {
          ${CANDIDATE_FIELDS}
        }
      }
      gems: Page(page: 1, perPage: 40) {
        media(type: ANIME, sort: SCORE_DESC, averageScore_greater: 76, popularity_lesser: 40000, format_not_in: [MUSIC]${adultFilter}) {
          ${CANDIDATE_FIELDS}
        }
      }
    }
  `;
  const data = await aniFetch<{
    greats: { media: RawMedia[] };
    seasonal: { media: RawMedia[] };
    gems: { media: RawMedia[] };
  }>(query, { season, year }, 86400);

  return [
    ...data.greats.media.map((m) => mapCandidate(m, "editorial", "greats")),
    ...data.seasonal.media.map((m) => mapCandidate(m, "editorial", "seasonal")),
    ...data.gems.media.map((m) => mapCandidate(m, "editorial", "gems")),
  ];
}

/** Tags, genres, studios and shape for titles the user already tracks. */
export async function getTasteMeta(ids: number[]): Promise<TasteMeta[]> {
  const query = `
    query ($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
          id
          genres
          format
          episodes
          seasonYear
          studios(isMain: true) { nodes { name } }
          tags { name rank category isGeneralSpoiler }
        }
      }
    }
  `;

  const out: TasteMeta[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await aniFetch<{ Page: { media: RawMedia[] } }>(
      query,
      { ids: chunk },
      86400,
    );
    for (const m of data.Page.media) {
      out.push({
        id: m.id,
        genres: m.genres ?? [],
        tags: mapTags(m),
        studios: m.studios?.nodes.map((s) => s.name) ?? [],
        format: m.format,
        episodes: m.episodes,
        seasonYear: m.seasonYear,
      });
    }
  }
  return out;
}

export async function getMetaForIds(ids: number[]): Promise<MediaMeta[]> {
  const out: MediaMeta[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await aniFetch<{
      Page: {
        media: { id: number; genres: string[]; duration: number | null }[];
      };
    }>(
      `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, type: ANIME) {
            id
            genres
            duration
          }
        }
      }
    `,
      { ids: chunk },
      86400,
    );
    for (const m of data.Page.media) {
      out.push({ id: m.id, genres: m.genres ?? [], duration: m.duration });
    }
  }
  return out;
}
