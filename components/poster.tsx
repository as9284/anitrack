import Image from "next/image";
import { cn } from "@/lib/utils";

interface PosterProps {
  src: string;
  alt: string;
  color?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function Poster({
  src,
  alt,
  color,
  sizes = "(max-width: 640px) 45vw, 180px",
  priority = false,
  className,
}: PosterProps) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden bg-surface",
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted">
          <i className="ti ti-photo text-2xl" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
