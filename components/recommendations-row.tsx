"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { AnimeCard } from "./anime-card";
import { PosterGridSkeleton } from "./skeletons";
import { fetchPools, fetchTasteMeta } from "@/lib/discover-fetch";
import {
  COLD_START_THRESHOLD,
  buildProfile,
  joinList,
  planPools,
  rankCandidates,
  type TasteEntry,
} from "@/lib/taste";
import type { DiscoverCandidate, TasteMeta } from "@/lib/types";

// A teaser for /discover, running the same engine on a deliberately narrow
// slice of the candidate pools — the ones Discover asks for anyway, so they
// come back warm from cache once either page has been visited.
interface Keyed<T> {
  key: string;
  value: T;
}

export function RecommendationsRow() {
  const hydrated = useHydrated();
  const entries = useStore((s) => s.entries);
  const [meta, setMeta] = useState<Keyed<TasteMeta[]> | null>(null);
  const [pools, setPools] = useState<Keyed<DiscoverCandidate[]> | null>(null);

  const entryList = useMemo<TasteEntry[]>(
    () =>
      Object.values(entries).map((entry) => ({
        id: entry.id,
        status: entry.status,
        progress: entry.progress,
        episodes: entry.episodes,
        title: entry.title,
        updatedAt: entry.updatedAt,
      })),
    [entries],
  );

  // Same daily seed rotation as /discover, so both pages ask for the same
  // recs pool and share its cache.
  const day = Math.floor(useNow(60_000) / 86_400_000);

  const idsKey = useMemo(
    () =>
      entryList
        .map((entry) => entry.id)
        .sort((a, b) => a - b)
        .join(","),
    [entryList],
  );

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetchTasteMeta(idsKey.split(",").map(Number)).then((items) => {
      if (!cancelled) setMeta({ key: idsKey, value: items });
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const metaReady = meta !== null && meta.key === idsKey;

  const profile = useMemo(
    () => buildProfile(entryList, metaReady ? meta.value : []),
    [entryList, meta, metaReady],
  );

  const cold = profile.sampleSize < COLD_START_THRESHOLD;

  // Home only needs a handful of picks, so skip the genre, studio and
  // blind-spot pools — those exist to fill out shelves on /discover.
  const plan = useMemo(() => {
    const full = planPools(profile, day);
    return {
      ...full,
      tags: full.tags.slice(0, 3),
      genres: [],
      gemGenres: full.gemGenres.slice(0, 1),
      studios: [],
      blindSpotGenres: [],
    };
  }, [profile, day]);

  const planKey = useMemo(() => JSON.stringify(plan), [plan]);

  useEffect(() => {
    if (!metaReady || cold) return;
    let cancelled = false;
    fetchPools(plan).then((items) => {
      if (!cancelled) setPools({ key: planKey, value: items });
    });
    return () => {
      cancelled = true;
    };
  }, [metaReady, cold, plan, planKey]);

  const picks = useMemo(() => {
    if (!metaReady || pools === null || pools.key !== planKey) return null;
    // Recs arrive once per seed, so the same title can rank more than once.
    const seen = new Set<number>();
    return rankCandidates(profile, pools.value)
      .filter((item) => {
        if (seen.has(item.candidate.id)) return false;
        seen.add(item.candidate.id);
        return true;
      })
      .slice(0, 8);
  }, [metaReady, pools, planKey, profile]);

  if (!hydrated || !idsKey || cold) return null;

  return (
    <section className="py-6">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="kicker">For you</p>
        <Link
          href="/discover"
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Open Discover →
        </Link>
      </div>
      <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted">
        {profile.topTags.length > 0
          ? `Closest to the ${joinList(profile.topTags.slice(0, 3))} thread running through your list.`
          : "Scored against everything in your list."}
      </p>

      {picks === null ? (
        <PosterGridSkeleton count={4} />
      ) : picks.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing new to suggest right now. Track a few more shows and this
          sharpens up.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
          {picks.map((item) => (
            <div key={item.candidate.id}>
              <AnimeCard media={item.candidate} />
              {item.reasons.length > 0 ? (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-accent">
                  {item.reasons[0]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
