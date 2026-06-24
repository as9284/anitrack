import Link from "next/link";
import { Poster } from "./poster";
import { Countdown } from "./countdown";
import { AddToListButton } from "./add-to-list-button";
import { formatLabel } from "@/lib/utils";
import type { MediaCard } from "@/lib/types";

interface AnimeCardProps {
  media: MediaCard;
  priority?: boolean;
}

export function AnimeCard({ media, priority = false }: AnimeCardProps) {
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
      </Link>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <AddToListButton media={media} />
      </div>
    </div>
  );
}
