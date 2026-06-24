import Link from "next/link";
import { cookies } from "next/headers";
import { getSeason } from "@/lib/anilist";
import { currentSeason, seasonLabel } from "@/lib/season";
import { ADULT_COOKIE } from "@/lib/adult";
import { AnimeCard } from "@/components/anime-card";
import { UpNextList } from "@/components/up-next-list";
import type { MediaCard } from "@/lib/types";

export default async function HomePage() {
  const cookieStore = await cookies();
  const allowAdult = cookieStore.get(ADULT_COOKIE)?.value === "1";
  const { season, year } = currentSeason();

  let media: MediaCard[] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await getSeason(season, year, allowAdult);
    media = result.media;
    total = result.total;
  } catch {
    failed = true;
  }

  const weekOf = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="pb-4">
      <section className="border-b border-line py-12 sm:py-16">
        <p className="kicker">Seasonal guide — week of {weekOf}</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-ink sm:text-6xl">
          {seasonLabel(season)} {year}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          {total > 0
            ? `${total} titles airing this season. Track what you're watching and never miss an episode.`
            : "Browse the season, follow what you love, and let the countdowns do the rest."}
        </p>
      </section>

      <section className="py-10">
        <p className="kicker mb-4">Up next — in your list</p>
        <UpNextList />
      </section>

      <section className="py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <p className="kicker">This season</p>
          <Link
            href="/seasons"
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            View all →
          </Link>
        </div>

        {failed ? (
          <p className="border border-line px-5 py-8 text-center text-sm text-muted">
            Couldn&apos;t reach AniList just now. Please refresh in a moment.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
            {media.slice(0, 12).map((item, index) => (
              <AnimeCard key={item.id} media={item} priority={index < 4} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
