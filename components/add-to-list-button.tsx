"use client";

import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import type { MediaCard } from "@/lib/types";

interface AddToListButtonProps {
  media: Pick<MediaCard, "id" | "title" | "cover" | "episodes" | "format">;
}

export function AddToListButton({ media }: AddToListButtonProps) {
  const hydrated = useHydrated();
  const inList = useStore((s) => Boolean(s.entries[media.id]));
  const add = useStore((s) => s.add);
  const remove = useStore((s) => s.remove);

  if (!hydrated) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (inList) {
      remove(media.id);
    } else {
      add(media, "planning");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={inList ? "Remove from list" : "Add to list"}
      title={inList ? "In your list — click to remove" : "Add to your list"}
      className={`flex h-7 w-7 items-center justify-center border text-sm transition-colors ${
        inList
          ? "border-accent bg-accent text-white"
          : "border-line bg-bg/85 text-ink backdrop-blur hover:border-ink"
      }`}
    >
      <i
        className={`ti ${inList ? "ti-check" : "ti-plus"}`}
        aria-hidden="true"
      />
    </button>
  );
}
