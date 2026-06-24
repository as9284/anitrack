import { stripHtml } from "./utils";
import type {
  AiringStatus,
  MediaCard,
  MediaDetail,
  MediaSeason,
  ScheduleItem,
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
  trailer?: { id: string; site: string } | null;
  externalLinks?: { site: string; url: string; color: string | null }[];
  relations?: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: RawTitle;
        coverImage: RawCover;
        format: string | null;
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
        })) ?? [],
  };
}

const CARD_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge color }
  format
  episodes
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

export async function getSeason(
  season: MediaSeason,
  year: number,
  allowAdult: boolean,
  page = 1,
): Promise<SeasonResult> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int) {
      Page(page: $page, perPage: 30) {
        pageInfo { total hasNextPage }
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC${adultFilter}) {
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

export async function getSchedule(
  start: number,
  end: number,
  allowAdult: boolean,
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

  while (hasNext && page <= 6) {
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
        trailer { id site }
        externalLinks { site url color }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
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
): Promise<MediaCard[]> {
  const adultFilter = allowAdult ? "" : ", isAdult: false";
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 30) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH${adultFilter}) {
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
