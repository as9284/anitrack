import type { WatchStatus } from "./types";

export const WATCH_STATUSES: { value: WatchStatus; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "planning", label: "Plan to watch" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

export const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const FORMATS = [
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
] as const;

export const SEASON_SORTS = [
  { value: "POPULARITY_DESC", label: "Popular" },
  { value: "SCORE_DESC", label: "Top rated" },
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "START_DATE_DESC", label: "Newest" },
  { value: "TITLE_ROMAJI", label: "A–Z" },
] as const;

export function isValidGenre(value: string | undefined): value is string {
  return value !== undefined && (GENRES as readonly string[]).includes(value);
}

export function isValidFormat(value: string | undefined): value is string {
  return value !== undefined && FORMATS.some((f) => f.value === value);
}

export function isValidSort(value: string | undefined): value is string {
  return value !== undefined && SEASON_SORTS.some((s) => s.value === value);
}
