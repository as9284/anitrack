import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRedis, syncKey, SYNC_CODE_PATTERN } from "@/lib/redis";
import { Poster } from "@/components/poster";
import type { WatchStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared list",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ code: string }>;
}

interface SharedEntry {
  id: number;
  status: WatchStatus;
  progress: number;
  title: string;
  cover: string;
  episodes: number | null;
}

interface SharedBlob {
  entries?: Record<string, SharedEntry>;
}

const SECTIONS: { status: WatchStatus; label: string }[] = [
  { status: "watching", label: "Watching" },
  { status: "planning", label: "Plan to watch" },
  { status: "completed", label: "Completed" },
  { status: "dropped", label: "Dropped" },
];

export default async function SharedListPage({ params }: PageProps) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  if (!SYNC_CODE_PATTERN.test(code)) notFound();

  let data: SharedBlob | null = null;
  try {
    data = await getRedis().get<SharedBlob>(syncKey(code));
  } catch {
    data = null;
  }

  if (!data || !data.entries) notFound();

  const entries = Object.values(data.entries);
  if (entries.length === 0) notFound();

  return (
    <div className="py-10">
      <p className="kicker">Shared library</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">A tracked list</h1>
      <p className="mt-3 text-sm text-muted">
        {entries.length} titles · read-only
      </p>

      {SECTIONS.map(({ status, label }) => {
        const items = entries.filter((e) => e.status === status);
        if (items.length === 0) return null;
        return (
          <section key={status} className="mt-10 border-t border-line pt-8">
            <p className="kicker mb-6">
              {label} · {items.length}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
              {items.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/anime/${entry.id}`}
                  className="block"
                >
                  <Poster
                    src={entry.cover}
                    alt={entry.title}
                    className="border border-line"
                  />
                  <h3 className="mt-2 line-clamp-2 font-serif text-sm text-ink">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {entry.progress}
                    {entry.episodes ? ` / ${entry.episodes}` : ""} episodes
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
