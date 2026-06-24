"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LINKS = [
  { label: "Home", href: "/", icon: "ti-home" },
  { label: "Seasons", href: "/seasons", icon: "ti-calendar-event" },
  { label: "Schedule", href: "/schedule", icon: "ti-clock" },
  { label: "Library", href: "/library", icon: "ti-bookmark" },
  { label: "Stats", href: "/stats", icon: "ti-chart-bar" },
  { label: "Settings", href: "/settings", icon: "ti-settings" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const items = useMemo(() => {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();
    const links = LINKS.filter((l) =>
      l.label.toLowerCase().includes(lower),
    ).map((l) => ({ key: l.href, label: l.label, icon: l.icon, href: l.href }));
    if (trimmed) {
      return [
        {
          key: "search",
          label: `Search for “${trimmed}”`,
          icon: "ti-search",
          href: `/search?q=${encodeURIComponent(trimmed)}`,
        },
        ...links,
      ];
    }
    return links;
  }, [query]);

  if (!open) return null;

  const safeActive = Math.min(active, Math.max(items.length - 1, 0));

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[safeActive];
      if (item) go(item.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg border border-line bg-bg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <i className="ti ti-search text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search or jump to…"
            aria-label="Command palette"
            className="w-full bg-transparent py-3.5 font-serif text-base text-ink outline-none placeholder:text-muted"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No matches</li>
          ) : (
            items.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    index === safeActive
                      ? "bg-surface text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
