"use client";

import { useRouter } from "next/navigation";
import { GENRES, FORMATS, SEASON_SORTS } from "@/lib/constants";
import { Select, type SelectOption } from "@/components/ui/select";

interface FilterBarProps {
  basePath: string;
  preserved: Record<string, string>;
  genre: string;
  format: string;
  sort: string;
  showSort?: boolean;
}

const GENRE_OPTIONS: SelectOption[] = [
  { value: "", label: "All genres" },
  ...GENRES.map((g) => ({ value: g, label: g })),
];

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "", label: "All formats" },
  ...FORMATS.map((f) => ({ value: f.value, label: f.label })),
];

const SORT_OPTIONS: SelectOption[] = SEASON_SORTS.map((s) => ({
  value: s.value,
  label: s.label,
}));

export function FilterBar({
  basePath,
  preserved,
  genre,
  format,
  sort,
  showSort = false,
}: FilterBarProps) {
  const router = useRouter();

  const push = (nextGenre: string, nextFormat: string, nextSort: string) => {
    const params = new URLSearchParams(preserved);
    if (nextGenre) params.set("genre", nextGenre);
    if (nextFormat) params.set("format", nextFormat);
    if (showSort && nextSort && nextSort !== "POPULARITY_DESC") {
      params.set("sort", nextSort);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const hasFilters = Boolean(genre || format || (showSort && sort));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        ariaLabel="Filter by genre"
        value={genre}
        options={GENRE_OPTIONS}
        onValueChange={(v) => push(v, format, sort)}
      />
      <Select
        ariaLabel="Filter by format"
        value={format}
        options={FORMAT_OPTIONS}
        onValueChange={(v) => push(genre, v, sort)}
      />
      {showSort ? (
        <Select
          ariaLabel="Sort by"
          value={sort || "POPULARITY_DESC"}
          options={SORT_OPTIONS}
          onValueChange={(v) => push(genre, format, v)}
        />
      ) : null}
      {hasFilters ? (
        <button
          type="button"
          onClick={() => push("", "", "")}
          className="px-2 py-2 text-xs text-muted transition-colors hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
