"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { WATCH_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MediaCard } from "@/lib/types";

interface AddToListButtonProps {
  media: Pick<MediaCard, "id" | "title" | "cover" | "episodes" | "format">;
}

export function AddToListButton({ media }: AddToListButtonProps) {
  const hydrated = useHydrated();
  const entry = useStore((s) => s.entries[media.id]);
  const quickAdd = useStore((s) => s.quickAdd);
  const remove = useStore((s) => s.remove);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!hydrated) return null;

  const inList = Boolean(entry);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const choose = (e: React.MouseEvent, status: (typeof WATCH_STATUSES)[number]["value"]) => {
    stop(e);
    quickAdd(media, status);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative transition-opacity",
        inList || open
          ? "opacity-100"
          : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={inList ? "Change list status" : "Add to list"}
        title={
          inList ? "In your list. Click to change." : "Add to your list"
        }
        className={cn(
          "flex h-7 w-7 items-center justify-center border text-sm transition-colors",
          inList
            ? "border-accent bg-accent text-white"
            : "border-line bg-bg/85 text-ink backdrop-blur hover:border-ink",
        )}
      >
        <i
          className={cn("ti", inList ? "ti-check" : "ti-plus")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-8 z-30 w-40 border border-line bg-bg py-1 text-left shadow-xl"
        >
          {WATCH_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="menuitem"
              onClick={(e) => choose(e, s.value)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-xs transition-colors",
                entry?.status === s.value
                  ? "text-ink"
                  : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              <span className="whitespace-nowrap">{s.label}</span>
              {entry?.status === s.value ? (
                <i className="ti ti-check text-accent" aria-hidden="true" />
              ) : null}
            </button>
          ))}
          {inList ? (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stop(e);
                remove(media.id);
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 border-t border-line px-3 py-2 text-xs text-muted transition-colors hover:text-accent"
            >
              <i className="ti ti-trash" aria-hidden="true" /> Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
