"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import type { MediaMeta, WatchStatus } from "@/lib/types";

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: "Watching",
  planning: "Plan to watch",
  completed: "Completed",
  dropped: "Dropped",
};

export default function StatsPage() {
  const hydrated = useHydrated();
  const entries = useStore((s) => s.entries);
  const [meta, setMeta] = useState<Record<number, MediaMeta>>({});

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
    fetch(`/api/meta?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaMeta[] }) => {
        if (cancelled) return;
        const map: Record<number, MediaMeta> = {};
        for (const item of data.items) map[item.id] = item;
        setMeta(map);
      })
      .catch(() => {
        if (!cancelled) setMeta({});
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const stats = useMemo(() => {
    const list = Object.values(entries);
    const statusCounts: Record<WatchStatus, number> = {
      watching: 0,
      planning: 0,
      completed: 0,
      dropped: 0,
    };
    let episodes = 0;
    let minutes = 0;
    const genreCounts: Record<string, number> = {};

    for (const e of list) {
      statusCounts[e.status] += 1;
      episodes += e.progress;
      const duration = meta[e.id]?.duration ?? 24;
      minutes += e.progress * duration;
      for (const g of meta[e.id]?.genres ?? []) {
        genreCounts[g] = (genreCounts[g] ?? 0) + 1;
      }
    }

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      total: list.length,
      statusCounts,
      episodes,
      hours: Math.round(minutes / 60),
      completionRate:
        list.length > 0
          ? Math.round((statusCounts.completed / list.length) * 100)
          : 0,
      topGenres,
      maxGenre: topGenres.length > 0 ? topGenres[0][1] : 0,
    };
  }, [entries, meta]);

  if (!hydrated) {
    return (
      <div className="py-10">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mb-8 mt-3 h-9 w-44" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="py-10">
        <p className="kicker">Insights</p>
        <h1 className="mb-6 mt-3 font-serif text-4xl text-ink">Your stats</h1>
        <div className="border border-line px-5 py-10 text-center">
          <p className="font-serif text-lg text-ink">No data yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Track some shows and your watching insights will appear here.
          </p>
          <Link
            href="/seasons"
            className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
          >
            Browse anime
          </Link>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Tracked", value: stats.total.toLocaleString() },
    { label: "Episodes watched", value: stats.episodes.toLocaleString() },
    { label: "Hours watched", value: `~${stats.hours.toLocaleString()}` },
    { label: "Completion", value: `${stats.completionRate}%` },
  ];

  return (
    <div className="py-10">
      <p className="kicker">Insights</p>
      <h1 className="mb-8 mt-3 font-serif text-4xl text-ink">Your stats</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="border border-line p-4">
            <p className="kicker">{m.label}</p>
            <p className="mt-2 font-serif text-3xl text-ink">{m.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 border-t border-line pt-8">
        <p className="kicker mb-5">By status</p>
        <div className="space-y-3">
          {(Object.keys(STATUS_LABELS) as WatchStatus[]).map((key) => {
            const count = stats.statusCounts[key];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-4">
                <span className="w-28 flex-none text-sm text-muted">
                  {STATUS_LABELS[key]}
                </span>
                <div className="h-2 flex-1 bg-surface">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 flex-none text-right text-sm text-ink">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {stats.topGenres.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <p className="kicker mb-5">Top genres</p>
          <div className="space-y-3">
            {stats.topGenres.map(([genre, count]) => {
              const pct = stats.maxGenre > 0 ? (count / stats.maxGenre) * 100 : 0;
              return (
                <div key={genre} className="flex items-center gap-4">
                  <span className="w-32 flex-none truncate text-sm text-muted">
                    {genre}
                  </span>
                  <div className="h-2 flex-1 bg-surface">
                    <div
                      className="h-full bg-ink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 flex-none text-right text-sm text-ink">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
