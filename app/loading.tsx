import { PosterGridSkeleton, UpNextSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="pb-4">
      <section className="border-b border-line py-12 sm:py-16">
        <div className="skeleton h-3 w-52" />
        <div className="skeleton mt-5 h-12 w-72 sm:h-14" />
        <div className="skeleton mt-5 h-4 w-full max-w-md" />
        <div className="skeleton mt-2 h-4 w-2/3 max-w-md" />
      </section>

      <section className="py-10">
        <div className="skeleton mb-4 h-3 w-40" />
        <UpNextSkeleton />
      </section>

      <section className="py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-3 w-16" />
        </div>
        <PosterGridSkeleton count={12} />
      </section>
    </div>
  );
}
