import { cookies } from "next/headers";
import type { Metadata } from "next";
import { searchMedia } from "@/lib/anilist";
import { ADULT_COOKIE } from "@/lib/adult";
import { AnimeCard } from "@/components/anime-card";
import { SearchBox } from "@/components/search-box";
import type { MediaCard } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const cookieStore = await cookies();
  const allowAdult = cookieStore.get(ADULT_COOKIE)?.value === "1";

  let results: MediaCard[] = [];
  let failed = false;
  if (query.length > 0) {
    try {
      results = await searchMedia(query, allowAdult);
    } catch {
      failed = true;
    }
  }

  return (
    <div className="py-10">
      <p className="kicker">Search</p>
      <h1 className="mb-6 mt-3 font-serif text-4xl text-ink">Find anime</h1>

      <SearchBox initialQuery={query} />

      <div className="mt-8">
        {query.length === 0 ? (
          <p className="text-sm text-muted">
            Start typing to search the AniList catalogue.
          </p>
        ) : failed ? (
          <p className="border border-line px-5 py-8 text-center text-sm text-muted">
            Couldn&apos;t reach AniList just now. Please try again.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted">
            No results for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
            {results.map((item) => (
              <AnimeCard key={item.id} media={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
