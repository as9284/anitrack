import { PosterGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="py-10">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton mb-6 mt-3 h-9 w-48" />

      <div className="skeleton h-[50px] w-full" />

      <div className="mt-8">
        <PosterGridSkeleton count={8} />
      </div>
    </div>
  );
}
