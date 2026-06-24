export default function Loading() {
  return (
    <div className="py-8">
      <div className="skeleton -mx-5 mb-8 h-44 sm:-mx-6 sm:h-56" />

      <div className="skeleton h-3 w-28" />

      <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        <div>
          <div className="skeleton aspect-[3/4] w-full border border-line" />
          <div className="skeleton mt-4 h-12 w-full" />
        </div>

        <div>
          <div className="skeleton h-9 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/3" />

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <div className="skeleton h-2.5 w-14" />
                <div className="skeleton mt-2 h-4 w-20" />
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-line pt-6">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-11/12" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
