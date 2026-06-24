import Link from "next/link";
import { Poster } from "./poster";
import { Countdown } from "./countdown";
import { AddToListButton } from "./add-to-list-button";
import { formatLabel, cn } from "@/lib/utils";
import type { MediaCard } from "@/lib/types";

interface AnimeCardProps {
  media: MediaCard;
  priority?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}

function CardBody({ media }: { media: MediaCard }) {
  return (
    <>
      <h3 className="mt-2 line-clamp-2 font-serif text-sm leading-snug text-ink">
        {media.title}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {media.nextAiringEpisode ? (
          <>
            Ep {media.nextAiringEpisode.episode} ·{" "}
            <Countdown
              airingAt={media.nextAiringEpisode.airingAt}
              mode="short"
            />
          </>
        ) : (
          <>
            {formatLabel(media.format)}
            {media.episodes ? ` · ${media.episodes} eps` : ""}
          </>
        )}
      </p>
    </>
  );
}

export function AnimeCard({
  media,
  priority = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: AnimeCardProps) {
  if (selectMode) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggleSelect?.(media.id)}
        className="group relative flex w-full flex-col text-left"
      >
        <Poster
          src={media.cover}
          alt={media.title}
          color={media.color}
          priority={priority}
          className={cn(
            "border transition-colors",
            selected ? "border-accent" : "border-line",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 transition-colors",
            selected ? "bg-accent/15" : "bg-transparent",
          )}
        />
        <span
          className={cn(
            "absolute left-2 top-2 flex h-5 w-5 items-center justify-center border transition-colors",
            selected
              ? "border-accent bg-accent text-white"
              : "border-line bg-surface text-transparent",
          )}
          aria-hidden="true"
        >
          <i className="ti ti-check text-sm" />
        </span>
        <CardBody media={media} />
      </button>
    );
  }

  return (
    <div className="group relative">
      <Link href={`/anime/${media.id}`} className="block">
        <Poster
          src={media.cover}
          alt={media.title}
          color={media.color}
          priority={priority}
          className="border border-line"
        />
        <CardBody media={media} />
      </Link>
      <div className="absolute right-2 top-2">
        <AddToListButton media={media} />
      </div>
    </div>
  );
}
