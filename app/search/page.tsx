import { cookies } from "next/headers";
import type { Metadata } from "next";
import { searchMedia } from "@/lib/anilist";
import { ADULT_COOKIE } from "@/lib/adult";
import { isValidGenre, isValidFormat } from "@/lib/constants";
import { SelectableGrid } from "@/components/selectable-grid";
import { SearchBox } from "@/components/search-box";
import { FilterBar } from "@/components/filter-bar";
import type { MediaCard } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; genre?: string; format?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const genre = isValidGenre(sp.genre) ? sp.genre : "";
  const format = isValidFormat(sp.format) ? sp.format : "";
  const cookieStore = await cookies();
  const allowAdult = cookieStore.get(ADULT_COOKIE)?.value === "1";

  let results: MediaCard[] = [];
  let failed = false;
  if (query.length > 0) {
    try {
      results = await searchMedia(query, allowAdult, {
        genre: genre || undefined,
        format: format || undefined,
      });
    } catch {
      failed = true;
    }
  }

  return (
    <div className="py-10">
      <p className="kicker">Search</p>
      <h1 className="mb-6 mt-3 font-serif text-4xl text-ink">Find anime</h1>

      <SearchBox initialQuery={query} />

      {query.length > 0 ? (
        <div className="mt-4">
          <FilterBar
            basePath="/search"
            preserved={{ q: query }}
            genre={genre}
            format={format}
            sort=""
          />
        </div>
      ) : null}

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
          <SelectableGrid media={results} />
        )}
      </div>
    </div>
  );
}
