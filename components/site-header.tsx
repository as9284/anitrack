"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useHydrated } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/seasons", label: "Seasons" },
  { href: "/schedule", label: "Schedule" },
  { href: "/library", label: "Library" },
  { href: "/stats", label: "Stats" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isMac =
    hydrated && typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const settingsActive = pathname.startsWith("/settings");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled || open
          ? "border-line bg-bg/90 backdrop-blur"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-page items-center gap-6 px-5 py-3.5 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg tracking-wide text-ink"
          onClick={() => setOpen(false)}
        >
          AniTrack
        </Link>

        <nav className="ml-2 hidden items-center gap-5 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-b border-transparent pb-0.5 text-sm transition-colors",
                isActive(pathname, item.href)
                  ? "border-ink text-ink"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search anime"
            className={cn(
              "flex h-9 w-9 items-center justify-center transition-colors hover:text-ink",
              pathname.startsWith("/search") ? "text-ink" : "text-muted",
            )}
          >
            <i className="ti ti-search text-[18px]" aria-hidden="true" />
          </Link>
          <kbd
            aria-hidden="true"
            className="mr-1 hidden select-none items-center gap-0.5 border border-line px-1.5 py-1 font-sans text-[10px] leading-none tracking-wide text-muted sm:flex"
          >
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
          <Link
            href="/settings"
            aria-label="Settings"
            className={cn(
              "flex h-9 w-9 items-center justify-center transition-colors hover:text-ink",
              settingsActive ? "text-ink" : "text-muted",
            )}
          >
            <i className="ti ti-settings text-[18px]" aria-hidden="true" />
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink sm:hidden"
          >
            <i
              className={`ti ${open ? "ti-x" : "ti-menu-2"} text-[18px]`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-bg px-5 pb-3 pt-1 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block py-2 text-sm",
                isActive(pathname, item.href)
                  ? "text-ink"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
