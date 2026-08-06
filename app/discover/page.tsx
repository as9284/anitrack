import type { Metadata } from "next";
import { DiscoverClient } from "@/components/discover-client";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Anime picked from the themes, studios and pacing your watchlist already points to.",
};

export default function DiscoverPage() {
  return (
    <div className="pb-4">
      <section className="py-12 sm:py-16">
        <p className="kicker">Personal recommendations</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-ink sm:text-6xl">
          Discover
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          Not a shuffle. Every shelf below comes with the reason it&apos;s
          there.
        </p>
      </section>

      <DiscoverClient />
    </div>
  );
}
