import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Not found</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        We couldn&apos;t find that page. Head back and keep browsing.
      </p>
      <Link
        href="/"
        className="mt-6 border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
      >
        Back home
      </Link>
    </div>
  );
}
