import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMedia } from "@/lib/anilist";
import { formatLabel, statusLabel } from "@/lib/utils";
import { Poster } from "@/components/poster";
import { Countdown } from "@/components/countdown";
import { AnimeTracker } from "@/components/anime-tracker";
import { FranchiseAdd } from "@/components/franchise-add";
import { TrailerPlayer } from "@/components/trailer-player";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: DetailPageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return { title: "Not found" };
  const media = await getMedia(id);
  return { title: media?.title ?? "Not found" };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const media = await getMedia(id);
  if (!media) notFound();

  const streaming = media.externalLinks.filter((l) => l.type === "STREAMING");
  const trailerSite =
    media.trailer?.site === "youtube" || media.trailer?.site === "dailymotion"
      ? media.trailer.site
      : null;

  const facts: { label: string; value: string }[] = [
    { label: "Format", value: formatLabel(media.format) },
    {
      label: "Episodes",
      value: media.episodes ? String(media.episodes) : "—",
    },
    {
      label: "Duration",
      value: media.duration ? `${media.duration} min` : "—",
    },
    { label: "Status", value: statusLabel(media.status) },
    {
      label: "Score",
      value: media.averageScore ? `${media.averageScore} / 100` : "—",
    },
    { label: "Studio", value: media.studios[0] ?? "—" },
  ];

  return (
    <div className="py-8">
      {media.banner ? (
        <div className="relative -mx-5 mb-8 h-44 overflow-hidden sm:-mx-6 sm:h-56">
          <Image
            src={media.banner}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-bg/40" />
        </div>
      ) : null}

      <Link
        href="/seasons"
        className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        ← Back to browse
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        <div>
          <div className="max-w-[200px] sm:max-w-none">
            <Poster
              src={media.cover}
              alt={media.title}
              color={media.color}
              sizes="200px"
              priority
              className="border border-line"
            />
          </div>
          <div className="mt-4">
            <AnimeTracker
              media={{
                id: media.id,
                title: media.title,
                cover: media.cover,
                episodes: media.episodes,
                format: media.format,
              }}
            />
          </div>
        </div>

        <div>
          <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
            {media.title}
          </h1>
          {media.native ? (
            <p className="mt-1 text-sm text-muted">{media.native}</p>
          ) : null}

          {media.nextAiringEpisode ? (
            <div className="mt-5 inline-flex items-center gap-2 border border-line px-4 py-2">
              <span className="kicker">
                Ep {media.nextAiringEpisode.episode} in
              </span>
              <Countdown
                airingAt={media.nextAiringEpisode.airingAt}
                mode="long"
                className="text-sm text-accent"
              />
            </div>
          ) : null}

          {media.genres.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="border border-line px-2.5 py-1 text-xs text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="kicker">{fact.label}</dt>
                <dd className="mt-1 text-sm text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {media.description ? (
            <div className="mt-6 border-t border-line pt-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">
                {media.description}
              </p>
            </div>
          ) : null}

          {streaming.length > 0 ? (
            <div className="mt-6 border-t border-line pt-6">
              <p className="kicker mb-3">Where to watch</p>
              <div className="flex flex-wrap gap-2">
                {streaming.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-ink"
                  >
                    {link.site}
                    <i
                      className="ti ti-external-link text-muted"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {trailerSite && media.trailer ? (
            <div className="mt-6 border-t border-line pt-6">
              <p className="kicker mb-3">Trailer</p>
              <TrailerPlayer
                site={trailerSite}
                id={media.trailer.id}
                thumbnail={media.trailer.thumbnail}
              />
            </div>
          ) : null}
        </div>
      </div>

      {media.relations.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <p className="kicker mb-5">Related</p>
          <FranchiseAdd relations={media.relations} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
            {media.relations.slice(0, 8).map((rel) => (
              <Link key={rel.id} href={`/anime/${rel.id}`} className="block">
                <Poster
                  src={rel.cover}
                  alt={rel.title}
                  className="border border-line"
                />
                <p className="kicker mt-2">{statusLabel(rel.relationType)}</p>
                <h3 className="mt-1 line-clamp-2 font-serif text-sm text-ink">
                  {rel.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
