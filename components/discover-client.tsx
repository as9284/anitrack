"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { AnimeCard } from "./anime-card";
import { PosterGridSkeleton } from "./skeletons";
import {
  fetchEditorial,
  fetchPools,
  fetchTasteMeta,
} from "@/lib/discover-fetch";
import {
  COLD_START_THRESHOLD,
  buildEditorialShelves,
  buildProfile,
  buildShelves,
  joinList,
  planPools,
  rankCandidates,
  type ScoredCandidate,
  type Shelf,
  type TasteEntry,
} from "@/lib/taste";
import type { DiscoverCandidate, TasteMeta } from "@/lib/types";

// Fetched data is stored alongside the key it was fetched for, so "is this
// stale?" is a derived comparison rather than a setState in an effect body
// (which the react-hooks purity rules rightly forbid).
interface Keyed<T> {
  key: string;
  value: T;
}

function ShelfSection({ shelf }: { shelf: Shelf }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="font-serif text-2xl leading-tight text-ink">
        {shelf.title}
      </h2>
      <p className="mb-7 mt-2 max-w-xl text-sm leading-relaxed text-muted">
        {shelf.reason}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
        {shelf.items.map((item) => (
          <PickCard key={item.candidate.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function PickCard({ item }: { item: ScoredCandidate }) {
  return (
    <div>
      <AnimeCard media={item.candidate} />
      {item.reasons.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-accent">
          {item.reasons[0]}
        </p>
      ) : null}
    </div>
  );
}

export function DiscoverClient() {
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

  // The seed window steps forward once a day so the "Because you finished"
  // shelves cycle through the list. Checked once a minute; the derived day
  // only changes at midnight, so nothing below recomputes until then.
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
    let cancelled = false;
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    fetchTasteMeta(ids).then((items) => {
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
  const plan = useMemo(() => planPools(profile, day), [profile, day]);
  const planKey = useMemo(
    () => (cold ? "editorial" : JSON.stringify(plan)),
    [cold, plan],
  );

  useEffect(() => {
    if (!metaReady) return;
    let cancelled = false;
    const load =
      planKey === "editorial" ? fetchEditorial() : fetchPools(plan);
    load.then((items) => {
      if (!cancelled) setPools({ key: planKey, value: items });
    });
    return () => {
      cancelled = true;
    };
  }, [metaReady, planKey, plan]);

  const shelves = useMemo(() => {
    if (!metaReady || pools === null || pools.key !== planKey) return null;
    return planKey === "editorial"
      ? buildEditorialShelves(pools.value, profile.seenIds)
      : buildShelves(profile, rankCandidates(profile, pools.value), day);
  }, [metaReady, pools, planKey, profile, day]);

  if (!hydrated) {
    return (
      <div className="border-t border-line py-10">
        <div className="skeleton h-7 w-64" />
        <div className="skeleton mb-7 mt-3 h-4 w-80" />
        <PosterGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <>
      {cold ? (
        <div className="border border-line px-5 py-6">
          <p className="kicker">Warming up</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Discover reads your watchlist to work out what you actually enjoy —
            what you finish, what you abandon, and the themes underneath both.
            Track a few more titles and these shelves get replaced with picks
            chosen for you. Until then, here&apos;s a solid place to start.
          </p>
        </div>
      ) : (
        <TasteSummary
          sampleSize={profile.sampleSize}
          topTags={profile.topTags}
          topStudios={[...profile.topStudios.keys()]}
        />
      )}

      {shelves === null ? (
        <div className="border-t border-line py-10">
          <div className="skeleton h-7 w-64" />
          <div className="skeleton mb-7 mt-3 h-4 w-80" />
          <PosterGridSkeleton count={8} />
        </div>
      ) : shelves.length === 0 ? (
        <div className="mt-10 border border-line px-5 py-10 text-center">
          <p className="font-serif text-lg text-ink">Nothing new to show</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Either AniList isn&apos;t responding, or you&apos;ve already tracked
            everything close to your taste. Try again shortly.
          </p>
          <Link
            href="/seasons"
            className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
          >
            Browse the season
          </Link>
        </div>
      ) : (
        shelves.map((shelf) => <ShelfSection key={shelf.key} shelf={shelf} />)
      )}
    </>
  );
}

function TasteSummary({
  sampleSize,
  topTags,
  topStudios,
}: {
  sampleSize: number;
  topTags: string[];
  topStudios: string[];
}) {
  if (topTags.length === 0) return null;
  return (
    <div className="border border-line px-5 py-6">
      <p className="kicker">Reading your list</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Built from <span className="text-ink">{sampleSize}</span> titles you
        finished, dropped or are part-way through. You gravitate toward{" "}
        <span className="text-ink">{joinList(topTags.slice(0, 4))}</span>
        {topStudios.length > 0 ? (
          <>
            , and keep returning to{" "}
            <span className="text-ink">{joinList(topStudios.slice(0, 2))}</span>
          </>
        ) : null}
        . Everything below is scored against that, in your browser.
      </p>
    </div>
  );
}
