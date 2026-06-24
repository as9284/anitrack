"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { AnimeCard } from "./anime-card";
import { PosterGridSkeleton } from "./skeletons";
import type { MediaCard } from "@/lib/types";

export function RecommendationsRow() {
  const hydrated = useHydrated();
  const entries = useStore((s) => s.entries);
  const [recs, setRecs] = useState<MediaCard[] | null>(null);

  const idsKey = useMemo(
    () =>
      Object.keys(entries)
        .map(Number)
        .sort((a, b) => a - b)
        .join(","),
    [entries],
  );

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetch(`/api/recommend?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaCard[] }) => {
        if (!cancelled) setRecs(data.items);
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!hydrated || !idsKey) return null;

  return (
    <section className="py-6">
      <p className="kicker mb-6">For you</p>
      {recs === null ? (
        <PosterGridSkeleton count={4} />
      ) : recs.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing to recommend yet. Track a few more shows and we&apos;ll find
          some picks for you.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
          {recs.slice(0, 8).map((item) => (
            <AnimeCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </section>
  );
}
