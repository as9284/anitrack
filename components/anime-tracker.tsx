"use client";

import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import type { MediaCard, WatchStatus } from "@/lib/types";

const STATUSES: { value: WatchStatus; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "planning", label: "Plan to watch" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

interface AnimeTrackerProps {
  media: Pick<MediaCard, "id" | "title" | "cover" | "episodes" | "format">;
}

export function AnimeTracker({ media }: AnimeTrackerProps) {
  const hydrated = useHydrated();
  const entry = useStore((s) => s.entries[media.id]);
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);
  const setStatus = useStore((s) => s.setStatus);
  const setProgress = useStore((s) => s.setProgress);

  if (!hydrated) {
    return <div className="skeleton h-32 w-full border border-line" />;
  }

  if (!entry) {
    return (
      <button
        type="button"
        onClick={() => add(media, "planning")}
        className="flex w-full items-center justify-center gap-2 border border-ink px-4 py-3 text-sm uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
      >
        <i className="ti ti-plus" aria-hidden="true" /> Add to list
      </button>
    );
  }

  const max = media.episodes ?? undefined;

  return (
    <div className="border border-line p-4">
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(media.id, s.value)}
            className={`border px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
              entry.status === s.value
                ? "border-accent bg-accent text-white"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="kicker">Progress</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Decrease progress"
            onClick={() => setProgress(media.id, entry.progress - 1)}
            className="flex h-8 w-8 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40"
            disabled={entry.progress <= 0}
          >
            <i className="ti ti-minus" aria-hidden="true" />
          </button>
          <span className="min-w-[64px] text-center font-serif text-base text-ink">
            {entry.progress} / {media.episodes ?? "?"}
          </span>
          <button
            type="button"
            aria-label="Increase progress"
            onClick={() => setProgress(media.id, entry.progress + 1)}
            className="flex h-8 w-8 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40"
            disabled={max !== undefined && entry.progress >= max}
          >
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => remove(media.id)}
        className="mt-4 flex w-full items-center justify-center gap-2 border-t border-line pt-4 text-xs text-muted transition-colors hover:text-accent"
      >
        <i className="ti ti-trash" aria-hidden="true" /> Remove from list
      </button>
    </div>
  );
}
