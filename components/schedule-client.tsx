"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useHydrated } from "@/lib/hooks";
import { Countdown } from "./countdown";
import type { ScheduleItem } from "@/lib/types";

interface ScheduleClientProps {
  items: ScheduleItem[];
}

interface DayGroup {
  key: string;
  label: string;
  items: ScheduleItem[];
}

function dayLabel(date: Date, todayKey: string, tomorrowKey: string): string {
  const key = date.toDateString();
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function ScheduleClient({ items }: ScheduleClientProps) {
  const hydrated = useHydrated();

  const groups = useMemo<DayGroup[]>(() => {
    if (!hydrated) return [];
    const today = new Date();
    const todayKey = today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowKey = tomorrow.toDateString();

    const map = new Map<string, DayGroup>();
    for (const item of items) {
      const date = new Date(item.airingAt * 1000);
      const key = date.toDateString();
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: dayLabel(date, todayKey, tomorrowKey),
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items, hydrated]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full border border-line" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="border border-line px-5 py-8 text-center text-sm text-muted">
        No episodes scheduled in this window.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="kicker mb-3 border-b border-line pb-2">
            {group.label}
          </div>
          <div>
            {group.items.map((item, index) => {
              const time = new Date(item.airingAt * 1000).toLocaleTimeString(
                undefined,
                { hour: "2-digit", minute: "2-digit" },
              );
              return (
                <Link
                  key={item.id}
                  href={`/anime/${item.media.id}`}
                  className={`flex items-center gap-4 py-3 ${
                    index === 0 ? "" : "border-t border-line"
                  }`}
                >
                  <span className="w-14 flex-none font-mono text-xs text-muted">
                    {time}
                  </span>
                  <div className="relative h-12 w-9 flex-none overflow-hidden bg-surface">
                    {item.media.cover ? (
                      <Image
                        src={item.media.cover}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm text-ink">
                      {item.media.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Episode {item.episode}
                    </p>
                  </div>
                  <span className="flex-none text-xs text-muted">
                    <Countdown airingAt={item.airingAt} mode="short" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
