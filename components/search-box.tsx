"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchBoxProps {
  initialQuery: string;
}

export function SearchBox({ initialQuery }: SearchBoxProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const push = (next: string) => {
    const trimmed = next.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 450);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    push(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <i
        className="ti ti-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search anime…"
        aria-label="Search anime"
        autoComplete="off"
        className="w-full border border-line bg-surface py-3 pl-10 pr-4 font-serif text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-ink"
      />
    </form>
  );
}
