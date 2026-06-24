"use client";

import { useState } from "react";
import Image from "next/image";

interface TrailerPlayerProps {
  site: "youtube" | "dailymotion";
  id: string;
  thumbnail: string | null;
}

export function TrailerPlayer({ site, id, thumbnail }: TrailerPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    const src =
      site === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
        : `https://www.dailymotion.com/embed/video/${id}?autoplay=1`;
    return (
      <div className="relative aspect-video max-w-md overflow-hidden border border-line bg-surface">
        <iframe
          src={src}
          title="Trailer"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Play trailer"
      className="relative block aspect-video w-full max-w-md overflow-hidden border border-line bg-surface"
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt="Trailer thumbnail"
          fill
          sizes="(max-width: 768px) 100vw, 28rem"
          className="object-cover"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center bg-bg/80 text-ink">
          <i className="ti ti-player-play text-xl" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
