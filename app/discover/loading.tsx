import { PosterGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="pb-4">
      <section className="py-12 sm:py-16">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton mt-4 h-14 w-64 sm:h-16" />
        <div className="skeleton mt-5 h-4 w-80" />
      </section>

      <div className="border border-line px-5 py-6">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-4 h-4 w-full max-w-2xl" />
        <div className="skeleton mt-2 h-4 w-2/3 max-w-lg" />
      </div>

      <div className="border-t border-line py-10">
        <div className="skeleton h-7 w-64" />
        <div className="skeleton mb-7 mt-3 h-4 w-80" />
        <PosterGridSkeleton count={8} />
      </div>
    </div>
  );
}
