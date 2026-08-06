export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type WatchStatus = "watching" | "planning" | "completed" | "dropped";

export interface AiringInfo {
  airingAt: number;
  episode: number;
}

export interface MediaCard {
  id: number;
  title: string;
  cover: string;
  color: string | null;
  format: string | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  genres: string[];
  nextAiringEpisode: AiringInfo | null;
  isAdult: boolean;
  seasonYear: number | null;
}

export interface RelationEntry {
  relationType: string;
  id: number;
  title: string;
  cover: string;
  format: string | null;
  episodes: number | null;
}

export interface ExternalLink {
  site: string;
  url: string;
  color: string | null;
  type: string | null;
}

export interface MediaDetail extends MediaCard {
  banner: string | null;
  description: string;
  native: string | null;
  status: string | null;
  season: MediaSeason | null;
  studios: string[];
  meanScore: number | null;
  popularity: number | null;
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  externalLinks: ExternalLink[];
  relations: RelationEntry[];
}

export interface ImportEntry {
  id: number;
  status: WatchStatus;
  progress: number;
  title: string;
  cover: string;
  episodes: number | null;
  format: string | null;
}

export interface ScheduleItem {
  id: number;
  airingAt: number;
  episode: number;
  media: MediaCard;
}

export interface MediaMeta {
  id: number;
  genres: string[];
  duration: number | null;
}

export interface MediaTag {
  name: string;
  rank: number;
  /** AniList tag category, e.g. "Theme-Drama", "Demographic", "Technical". */
  category: string | null;
  /** Tag reveals a plot twist — usable for scoring, never shown as a reason. */
  spoiler: boolean;
}

/** The reference data Discover needs about a title the user already tracks. */
export interface TasteMeta {
  id: number;
  genres: string[];
  tags: MediaTag[];
  studios: string[];
  format: string | null;
  episodes: number | null;
  seasonYear: number | null;
}

export type DiscoverSource =
  | "recs"
  | "tag"
  | "genre"
  | "studio"
  | "gems"
  | "editorial";

export interface DiscoverCandidate extends MediaCard {
  popularity: number | null;
  status: string | null;
  studios: string[];
  tags: MediaTag[];
  /** Direct anime prequels — used to hide seasons of series you haven't seen. */
  prequelIds: number[];
  source: DiscoverSource;
  /** The tag/genre/studio name, or the seed media id for `recs`. */
  sourceTerm: string;
  /** How strongly AniList users co-recommend this with the seed. `recs` only. */
  crowdRating: number | null;
}

export interface AiringStatus {
  id: number;
  status: string | null;
  episodes: number | null;
  nextAiringEpisode: AiringInfo | null;
}

export interface NotifyMedia {
  id: number;
  title: string;
  cover: string;
  episodes: number | null;
  nextAiringEpisode: AiringInfo | null;
}
