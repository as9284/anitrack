"use client";

import { useState } from "react";
import { AnimeCard } from "./anime-card";
import { Select } from "./ui/select";
import { useStore } from "@/lib/store";
import { WATCH_STATUSES } from "@/lib/constants";
import type { MediaCard, WatchStatus } from "@/lib/types";

interface SelectableGridProps {
  media: MediaCard[];
  priorityCount?: number;
}

export function SelectableGrid({
  media,
  priorityCount = 0,
}: SelectableGridProps) {
  const quickAddMany = useStore((s) => s.quickAddMany);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<WatchStatus>("completed");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exit = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const enter = () => {
    setConfirmation(null);
    setSelectMode(true);
  };

  const allSelected = media.length > 0 && selected.size === media.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(media.map((m) => m.id)));

  const apply = () => {
    const chosen = media.filter((m) => selected.has(m.id));
    if (chosen.length === 0) return;
    quickAddMany(chosen, status);
    const label = WATCH_STATUSES.find((s) => s.value === status)?.label ?? "list";
    setConfirmation(
      `Added ${chosen.length} ${chosen.length === 1 ? "title" : "titles"} as ${label}.`,
    );
    exit();
  };

  return (
    <div>
      <div className="mb-4 flex min-h-[2rem] items-center justify-between gap-4">
        <p className="text-xs text-muted" aria-live="polite">
          {selectMode
            ? `${selected.size} selected`
            : confirmation
              ? confirmation
              : ""}
        </p>
        {selectMode ? (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={toggleAll}
              className="text-muted transition-colors hover:text-ink"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={exit}
              className="text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enter}
            className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <i className="ti ti-checkbox" aria-hidden="true" /> Select
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
        {media.map((item, index) => (
          <AnimeCard
            key={item.id}
            media={item}
            priority={index < priorityCount}
            selectMode={selectMode}
            selected={selected.has(item.id)}
            onToggleSelect={toggle}
          />
        ))}
      </div>

      {selectMode && selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 border border-line bg-bg/95 px-4 py-3 shadow-xl backdrop-blur">
            <span className="font-serif text-sm text-ink">
              {selected.size} selected
            </span>
            <span className="text-xs uppercase tracking-wider text-muted">
              add as
            </span>
            <Select
              ariaLabel="Status for selected titles"
              value={status}
              onValueChange={(v) => setStatus(v as WatchStatus)}
              options={WATCH_STATUSES}
              align="right"
              side="top"
            />
            <button
              type="button"
              onClick={apply}
              className="border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-wider text-bg transition-colors hover:bg-accent hover:border-accent"
            >
              Add {selected.size}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
