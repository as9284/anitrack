"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/hooks";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink"
    >
      {hydrated ? (
        <i
          className={`ti ${isDark ? "ti-sun" : "ti-moon"} text-[18px]`}
          aria-hidden="true"
        />
      ) : (
        <i className="ti ti-moon text-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
