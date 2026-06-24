export default function Loading() {
  return (
    <div className="py-10">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mb-6 mt-3 h-9 w-44" />

      <div className="flex gap-5 border-b border-line pb-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-4 w-20" />
        ))}
      </div>

      <ul className="mt-6">
        {Array.from({ length: 4 }, (_, i) => (
          <li
            key={i}
            className={`flex items-center gap-4 py-4 ${
              i === 0 ? "" : "border-t border-line"
            }`}
          >
            <div className="skeleton h-[72px] w-[50px] flex-none border border-line" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-7 w-32" />
            </div>
            <div className="flex flex-none flex-col items-end gap-2">
              <div className="skeleton h-6 w-24" />
              <div className="skeleton h-3 w-14" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
