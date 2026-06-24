import { PosterGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="py-10">
      <div className="skeleton h-3 w-32" />
      <div className="skeleton mt-3 h-9 w-64" />

      <div className="mt-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-4 w-14" />
            ))}
          </div>
          <div className="skeleton h-4 w-16" />
        </div>
      </div>

      <div className="mt-8">
        <PosterGridSkeleton count={12} />
      </div>
    </div>
  );
}
