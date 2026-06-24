"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { Select } from "@/components/ui/select";
import type { WatchStatus } from "@/lib/types";

const TABS: { value: WatchStatus; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "planning", label: "Plan to watch" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

export default function LibraryPage() {
  const hydrated = useHydrated();
  const entries = useStore((s) => s.entries);
  const setProgress = useStore((s) => s.setProgress);
  const setStatus = useStore((s) => s.setStatus);
  const remove = useStore((s) => s.remove);
  const [tab, setTab] = useState<WatchStatus>("watching");

  const counts = useMemo(() => {
    const c: Record<WatchStatus, number> = {
      watching: 0,
      planning: 0,
      completed: 0,
      dropped: 0,
    };
    for (const e of Object.values(entries)) c[e.status] += 1;
    return c;
  }, [entries]);

  const list = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === tab)
        .sort((a, b) => b.addedAt - a.addedAt),
    [entries, tab],
  );

  return (
    <div className="py-10">
      <p className="kicker">Your library</p>
      <h1 className="mb-6 mt-3 font-serif text-4xl text-ink">Tracking</h1>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`border-b pb-0.5 text-sm transition-colors ${
              tab === t.value
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted">
              {hydrated ? counts[t.value] : 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!hydrated ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 w-full border border-line" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="border border-line px-5 py-10 text-center">
            <p className="font-serif text-lg text-ink">Nothing here yet</p>
            <Link
              href="/seasons"
              className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
            >
              Browse anime
            </Link>
          </div>
        ) : (
          <ul>
            {list.map((entry, index) => (
              <li
                key={entry.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-3 py-4 ${
                  index === 0 ? "" : "border-t border-line"
                }`}
              >
                <Link
                  href={`/anime/${entry.id}`}
                  className="relative h-[72px] w-[50px] flex-none overflow-hidden border border-line bg-surface"
                >
                  {entry.cover ? (
                    <Image
                      src={entry.cover}
                      alt=""
                      fill
                      sizes="50px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/anime/${entry.id}`}
                    className="font-serif text-base text-ink hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease progress"
                      onClick={() => setProgress(entry.id, entry.progress - 1)}
                      disabled={entry.progress <= 0}
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40 sm:h-7 sm:w-7"
                    >
                      <i className="ti ti-minus" aria-hidden="true" />
                    </button>
                    <span className="min-w-[58px] text-center text-sm text-muted">
                      {entry.progress} / {entry.episodes ?? "?"}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase progress"
                      onClick={() => setProgress(entry.id, entry.progress + 1)}
                      disabled={
                        entry.episodes !== null &&
                        entry.progress >= entry.episodes
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40 sm:h-7 sm:w-7"
                    >
                      <i className="ti ti-plus" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 pl-[66px] sm:w-auto sm:flex-none sm:flex-col sm:items-end sm:pl-0">
                  <Select
                    ariaLabel="Change status"
                    value={entry.status}
                    align="right"
                    className="w-36"
                    options={TABS.map((t) => ({
                      value: t.value,
                      label: t.label,
                    }))}
                    onValueChange={(v) =>
                      setStatus(entry.id, v as WatchStatus)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    className="text-xs text-muted transition-colors hover:text-accent"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
