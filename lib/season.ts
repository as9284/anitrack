import type { MediaSeason } from "./types";

export const SEASONS: MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

const SEASON_LABELS: Record<MediaSeason, string> = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  FALL: "Fall",
};

export function seasonLabel(season: MediaSeason): string {
  return SEASON_LABELS[season];
}

export function currentSeason(date = new Date()): {
  season: MediaSeason;
  year: number;
} {
  const month = date.getMonth();
  const year = date.getFullYear();
  const season: MediaSeason =
    month < 3 ? "WINTER" : month < 6 ? "SPRING" : month < 9 ? "SUMMER" : "FALL";
  return { season, year };
}

export function isValidSeason(value: string | undefined): value is MediaSeason {
  return value !== undefined && SEASONS.includes(value as MediaSeason);
}

export function stepSeason(
  season: MediaSeason,
  year: number,
  direction: 1 | -1,
): { season: MediaSeason; year: number } {
  const index = SEASONS.indexOf(season);
  const next = index + direction;
  if (next < 0) return { season: "FALL", year: year - 1 };
  if (next > 3) return { season: "WINTER", year: year + 1 };
  return { season: SEASONS[next], year };
}
