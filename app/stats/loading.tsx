export default function Loading() {
  return (
    <div className="py-10">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mb-8 mt-3 h-9 w-44" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <div className="skeleton mb-5 h-3 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-2 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
