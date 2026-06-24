"use client";

import { useNow, useHydrated } from "@/lib/hooks";
import { formatCountdown } from "@/lib/utils";

interface CountdownProps {
  airingAt: number;
  mode?: "short" | "long";
  className?: string;
}

export function Countdown({
  airingAt,
  mode = "long",
  className,
}: CountdownProps) {
  const hydrated = useHydrated();
  const now = useNow(1000);

  if (!hydrated) {
    return <span className={className}>—</span>;
  }

  const remaining = airingAt - Math.floor(now / 1000);
  return <span className={className}>{formatCountdown(remaining, mode)}</span>;
}
