export default function Loading() {
  return (
    <div className="max-w-2xl py-10">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mb-8 mt-3 h-9 w-40" />

      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="border-t border-line py-7">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton mt-3 h-4 w-3/4" />
          <div className="mt-4 flex gap-2">
            <div className="skeleton h-9 w-28" />
            <div className="skeleton h-9 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
