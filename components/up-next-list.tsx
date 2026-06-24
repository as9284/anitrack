"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { Countdown } from "./countdown";
import type { AiringStatus } from "@/lib/types";

export function UpNextList() {
  const hydrated = useHydrated();
  const now = useNow(30000);
  const entries = useStore((s) => s.entries);
  const [airing, setAiring] = useState<Record<number, AiringStatus>>({});

  const watching = useMemo(
    () =>
      Object.values(entries).filter(
        (e) => e.status === "watching" || e.status === "planning",
      ),
    [entries],
  );

  const idsKey = useMemo(
    () =>
      watching
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .join(","),
    [watching],
  );

  useEffect(() => {
    if (!idsKey) {
      return;
    }
    let cancelled = false;
    fetch(`/api/airing?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: AiringStatus[] }) => {
        if (cancelled) return;
        const map: Record<number, AiringStatus> = {};
        for (const item of data.items) map[item.id] = item;
        setAiring(map);
      })
      .catch(() => {
        if (!cancelled) setAiring({});
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!hydrated) {
    return <ListSkeleton />;
  }

  if (watching.length === 0) {
    return (
      <div className="border border-line px-5 py-8 text-center">
        <p className="font-serif text-lg text-ink">Nothing tracked yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Add shows to your list and their next episodes will line up here with
          live countdowns.
        </p>
        <Link
          href="/seasons"
          className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
        >
          Browse the season
        </Link>
      </div>
    );
  }

  const sorted = [...watching].sort((a, b) => {
    const aAir = airing[a.id]?.nextAiringEpisode?.airingAt ?? Infinity;
    const bAir = airing[b.id]?.nextAiringEpisode?.airingAt ?? Infinity;
    return aAir - bAir;
  });

  return (
    <div>
      {sorted.map((entry, index) => {
        const next = airing[entry.id]?.nextAiringEpisode ?? null;
        const totalEpisodes = airing[entry.id]?.episodes ?? entry.episodes;
        const soon = next ? next.airingAt - now / 1000 < 86400 : false;
        return (
          <Link
            key={entry.id}
            href={`/anime/${entry.id}`}
            className={`flex items-center gap-4 py-3.5 ${
              index === 0 ? "" : "border-t border-line"
            }`}
          >
            <div className="relative h-[54px] w-[38px] flex-none overflow-hidden bg-surface">
              {entry.cover ? (
                <Image
                  src={entry.cover}
                  alt=""
                  fill
                  sizes="38px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base text-ink">
                {entry.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {next ? `Episode ${next.episode}` : "No upcoming episode"} ·{" "}
                {entry.progress} of {totalEpisodes ?? "?"} watched
              </p>
            </div>
            <div className="flex-none text-right">
              {next ? (
                <>
                  <p
                    className={`text-sm ${soon ? "text-accent" : "text-ink"}`}
                  >
                    {soon ? (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                    ) : null}
                    <Countdown airingAt={next.airingAt} mode="long" />
                  </p>
                  <p className="kicker mt-1 text-[0.6rem]">until air</p>
                </>
              ) : (
                <p className="text-xs text-muted">—</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-4 py-3.5 ${
            i === 0 ? "" : "border-t border-line"
          }`}
        >
          <div className="skeleton h-[54px] w-[38px] flex-none" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
