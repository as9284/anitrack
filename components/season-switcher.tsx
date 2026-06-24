import Link from "next/link";
import { SEASONS, seasonLabel, stepSeason } from "@/lib/season";
import type { MediaSeason } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SeasonSwitcherProps {
  season: MediaSeason;
  year: number;
}

function href(season: MediaSeason, year: number): string {
  return `/seasons?season=${season}&year=${year}`;
}

export function SeasonSwitcher({ season, year }: SeasonSwitcherProps) {
  const prev = stepSeason(season, year, -1);
  const next = stepSeason(season, year, 1);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-4">
        {SEASONS.map((s) => (
          <Link
            key={s}
            href={href(s, year)}
            className={cn(
              "border-b pb-0.5 text-sm transition-colors",
              s === season
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {seasonLabel(s)}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 text-muted">
        <Link
          href={href(prev.season, prev.year)}
          aria-label="Previous season"
          className="transition-colors hover:text-ink"
        >
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </Link>
        <span className="font-mono text-xs text-ink">{year}</span>
        <Link
          href={href(next.season, next.year)}
          aria-label="Next season"
          className="transition-colors hover:text-ink"
        >
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
