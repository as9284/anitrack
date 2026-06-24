export function PosterCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[3/4] w-full border border-line" />
      <div className="skeleton mt-2 h-4 w-3/4" />
      <div className="skeleton mt-2 h-3 w-1/2" />
    </div>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <PosterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function UpNextSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 py-3.5 ${
            i === 0 ? "" : "border-t border-line"
          }`}
        >
          <div className="skeleton h-[54px] w-[38px] flex-none" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="hidden flex-none flex-col items-end gap-2 sm:flex">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 3 }, (_, g) => (
        <section key={g}>
          <div className="skeleton mb-3 h-3 w-28" />
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 py-3 ${
                  i === 0 ? "" : "border-t border-line"
                }`}
              >
                <div className="skeleton h-3 w-12 flex-none" />
                <div className="skeleton h-12 w-9 flex-none" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/5" />
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="skeleton h-3 w-12 flex-none" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
