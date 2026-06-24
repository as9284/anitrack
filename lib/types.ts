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
}

export interface ExternalLink {
  site: string;
  url: string;
  color: string | null;
}

export interface MediaDetail extends MediaCard {
  banner: string | null;
  description: string;
  native: string | null;
  duration: number | null;
  status: string | null;
  season: MediaSeason | null;
  studios: string[];
  meanScore: number | null;
  popularity: number | null;
  trailer: { id: string; site: string } | null;
  externalLinks: ExternalLink[];
  relations: RelationEntry[];
}

export interface ScheduleItem {
  id: number;
  airingAt: number;
  episode: number;
  media: MediaCard;
}

export interface AiringStatus {
  id: number;
  status: string | null;
  episodes: number | null;
  nextAiringEpisode: AiringInfo | null;
}
