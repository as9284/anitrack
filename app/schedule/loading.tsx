import { ScheduleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="py-10">
      <div className="skeleton h-3 w-36" />
      <div className="skeleton mt-3 h-9 w-48" />
      <div className="skeleton mt-3 h-4 w-full max-w-md" />

      <div className="mt-10">
        <ScheduleSkeleton />
      </div>
    </div>
  );
}
