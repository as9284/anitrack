import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getSeason } from "@/lib/anilist";
import { currentSeason, isValidSeason, seasonLabel } from "@/lib/season";
import { ADULT_COOKIE } from "@/lib/adult";
import { AnimeCard } from "@/components/anime-card";
import { SeasonSwitcher } from "@/components/season-switcher";
import type { MediaCard, MediaSeason } from "@/lib/types";

export const metadata: Metadata = {
  title: "Seasons",
};

interface SeasonsPageProps {
  searchParams: Promise<{ season?: string; year?: string; page?: string }>;
}

export default async function SeasonsPage({ searchParams }: SeasonsPageProps) {
  const sp = await searchParams;
  const fallback = currentSeason();
  const season: MediaSeason = isValidSeason(sp.season)
    ? sp.season
    : fallback.season;
  const parsedYear = Number(sp.year);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 1940 && parsedYear <= 2100
      ? parsedYear
      : fallback.year;
  const parsedPage = Number(sp.page);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const cookieStore = await cookies();
  const allowAdult = cookieStore.get(ADULT_COOKIE)?.value === "1";

  let media: MediaCard[] = [];
  let hasNextPage = false;
  let failed = false;
  try {
    const result = await getSeason(season, year, allowAdult, page);
    media = result.media;
    hasNextPage = result.hasNextPage;
  } catch {
    failed = true;
  }

  return (
    <div className="py-10">
      <p className="kicker">Seasonal chart</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">
        {seasonLabel(season)} {year}
      </h1>

      <div className="mt-6 border-b border-line pb-5">
        <SeasonSwitcher season={season} year={year} />
      </div>

      {failed ? (
        <p className="mt-10 border border-line px-5 py-8 text-center text-sm text-muted">
          Couldn&apos;t reach AniList just now. Please refresh in a moment.
        </p>
      ) : media.length === 0 ? (
        <p className="mt-10 border border-line px-5 py-8 text-center text-sm text-muted">
          No titles found for this season.
        </p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
            {media.map((item, index) => (
              <AnimeCard key={item.id} media={item} priority={index < 4} />
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={`/seasons?season=${season}&year=${year}&page=${page - 1}`}
                className="text-muted hover:text-ink"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {hasNextPage ? (
              <Link
                href={`/seasons?season=${season}&year=${year}&page=${page + 1}`}
                className="text-muted hover:text-ink"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  );
}
