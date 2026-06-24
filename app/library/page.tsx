"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useStore, type WatchEntry } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { Select } from "@/components/ui/select";
import type { WatchStatus } from "@/lib/types";

const TABS: { value: WatchStatus; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "planning", label: "Plan to watch" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

const PAGE_SIZE = 20;

const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

type SortKey = "recent" | "title" | "progress";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Title A–Z" },
  { value: "progress", label: "Most watched" },
];

interface RelationLinks {
  id: number;
  neighbors: number[];
}

interface SeriesGroup {
  key: number;
  items: WatchEntry[];
  recent: number;
  title: string;
  progress: number;
}

// Union-find over sequel/prequel links. Tracked seasons connect even through an
// untracked middle season, because they share its id as a neighbor. Ids with no
// relation data fall back to their own id, i.e. a singleton group.
function useGroupKeys(links: RelationLinks[], entries: Record<number, WatchEntry>) {
  return useMemo(() => {
    const parent = new Map<number, number>();
    const find = (x: number): number => {
      let r = x;
      while ((parent.get(r) ?? r) !== r) r = parent.get(r) as number;
      return r;
    };
    const ensure = (x: number) => {
      if (!parent.has(x)) parent.set(x, x);
    };
    for (const link of links) {
      ensure(link.id);
      for (const n of link.neighbors) {
        ensure(n);
        const ra = find(link.id);
        const rb = find(n);
        if (ra !== rb) parent.set(ra, rb);
      }
    }
    const map: Record<number, number> = {};
    for (const e of Object.values(entries)) map[e.id] = find(e.id);
    return map;
  }, [links, entries]);
}

export default function LibraryPage() {
  const hydrated = useHydrated();
  const entries = useStore((s) => s.entries);
  const setProgress = useStore((s) => s.setProgress);
  const setStatus = useStore((s) => s.setStatus);
  const remove = useStore((s) => s.remove);

  const [tab, setTab] = useState<WatchStatus>("watching");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [links, setLinks] = useState<RelationLinks[]>([]);

  const allIdsKey = useMemo(
    () =>
      Object.values(entries)
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .join(","),
    [entries],
  );

  useEffect(() => {
    if (!allIdsKey) return;
    let cancelled = false;
    fetch(`/api/relations?ids=${allIdsKey}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: RelationLinks[] }) => {
        if (!cancelled) setLinks(data.items);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [allIdsKey]);

  const groupKeyOf = useGroupKeys(links, entries);

  const counts = useMemo(() => {
    const c: Record<WatchStatus, number> = {
      watching: 0,
      planning: 0,
      completed: 0,
      dropped: 0,
    };
    for (const e of Object.values(entries)) c[e.status] += 1;
    return c;
  }, [entries]);

  const formatOptions = useMemo(() => {
    const present = new Set<string>();
    for (const e of Object.values(entries)) {
      if (e.status === tab && e.format) present.add(e.format);
    }
    const opts = [...present]
      .sort()
      .map((f) => ({ value: f, label: FORMAT_LABELS[f] ?? f }));
    return [{ value: "all", label: "All formats" }, ...opts];
  }, [entries, tab]);

  const groups = useMemo<SeriesGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = Object.values(entries).filter(
      (e) =>
        e.status === tab &&
        (format === "all" || e.format === format) &&
        (q === "" || e.title.toLowerCase().includes(q)),
    );
    const buckets = new Map<number, WatchEntry[]>();
    for (const e of filtered) {
      const k = groupKeyOf[e.id] ?? e.id;
      const arr = buckets.get(k);
      if (arr) arr.push(e);
      else buckets.set(k, [e]);
    }
    const built = [...buckets.entries()].map(([key, items]) => {
      items.sort((a, b) => a.id - b.id); // ascending id ≈ release order
      const recent = items.reduce((m, i) => Math.max(m, i.addedAt), 0);
      const progress = items.reduce((s, i) => s + i.progress, 0);
      // shortest title ≈ the base season / franchise name
      const title = items.reduce((a, b) =>
        b.title.length < a.title.length ? b : a,
      ).title;
      return { key, items, recent, title, progress };
    });
    built.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "progress") return b.progress - a.progress;
      return b.recent - a.recent;
    });
    return built;
  }, [entries, tab, query, format, sort, groupKeyOf]);

  const shown = groups.slice(0, visible);

  function selectTab(value: WatchStatus) {
    setTab(value);
    setFormat("all");
    setVisible(PAGE_SIZE);
  }

  function onFormat(value: string) {
    setFormat(value);
    setVisible(PAGE_SIZE);
  }

  function onSort(value: string) {
    setSort(value as SortKey);
    setVisible(PAGE_SIZE);
  }

  function onSearch(value: string) {
    setQuery(value);
    setVisible(PAGE_SIZE);
  }

  function toggle(key: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const tabLabel = TABS.find((t) => t.value === tab)?.label ?? "";

  return (
    <div className="py-10">
      <p className="kicker">Your library</p>
      <h1 className="mb-6 mt-3 font-serif text-4xl text-ink">Tracking</h1>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => selectTab(t.value)}
            className={`border-b pb-0.5 text-sm transition-colors ${
              tab === t.value
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted">
              {hydrated ? counts[t.value] : 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <i
            className="ti ti-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={`Search ${tabLabel.toLowerCase()}`}
            aria-label={`Search ${tabLabel}`}
            className="w-full border border-line bg-surface py-2 pl-9 pr-9 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-muted transition-colors hover:text-ink"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-3">
          {formatOptions.length > 1 ? (
            <Select
              ariaLabel="Filter by format"
              value={format}
              align="right"
              className="flex-1 sm:w-36 sm:flex-none"
              options={formatOptions}
              onValueChange={onFormat}
            />
          ) : null}
          <Select
            ariaLabel="Sort library"
            value={sort}
            align="right"
            className="flex-1 sm:w-40 sm:flex-none"
            options={SORT_OPTIONS}
            onValueChange={onSort}
          />
        </div>
      </div>

      <div className="mt-6">
        {!hydrated ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 w-full border border-line" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="border border-line px-5 py-10 text-center">
            <p className="font-serif text-lg text-ink">
              {query ? "No matches" : "Nothing here yet"}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => onSearch("")}
                className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
              >
                Clear search
              </button>
            ) : (
              <Link
                href="/seasons"
                className="mt-4 inline-block border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg"
              >
                Browse anime
              </Link>
            )}
          </div>
        ) : (
          <>
            <ul>
              {shown.map((group, index) => (
                <li
                  key={group.key}
                  className={index === 0 ? "" : "border-t border-line"}
                >
                  {group.items.length === 1 ? (
                    <div className="py-4">
                      <EntryRow
                        entry={group.items[0]}
                        setProgress={setProgress}
                        setStatus={setStatus}
                        remove={remove}
                      />
                    </div>
                  ) : (
                    <SeriesBlock
                      group={group}
                      open={expanded.has(group.key)}
                      onToggle={() => toggle(group.key)}
                      setProgress={setProgress}
                      setStatus={setStatus}
                      remove={remove}
                    />
                  )}
                </li>
              ))}
            </ul>

            {groups.length > visible ? (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="mt-6 w-full border border-line py-3 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
              >
                Load more ({groups.length - visible})
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  entry: WatchEntry;
  setProgress: (id: number, progress: number) => void;
  setStatus: (id: number, status: WatchStatus) => void;
  remove: (id: number) => void;
}

function EntryRow({ entry, setProgress, setStatus, remove }: RowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Link
        href={`/anime/${entry.id}`}
        className="relative h-[72px] w-[50px] flex-none overflow-hidden border border-line bg-surface"
      >
        {entry.cover ? (
          <Image
            src={entry.cover}
            alt=""
            fill
            sizes="50px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/anime/${entry.id}`}
          className="font-serif text-base text-ink hover:underline"
        >
          {entry.title}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease progress"
            onClick={() => setProgress(entry.id, entry.progress - 1)}
            disabled={entry.progress <= 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40 sm:h-7 sm:w-7"
          >
            <i className="ti ti-minus" aria-hidden="true" />
          </button>
          <span className="min-w-[58px] text-center text-sm text-muted">
            {entry.progress} / {entry.episodes ?? "?"}
          </span>
          <button
            type="button"
            aria-label="Increase progress"
            onClick={() => setProgress(entry.id, entry.progress + 1)}
            disabled={
              entry.episodes !== null && entry.progress >= entry.episodes
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink disabled:opacity-40 sm:h-7 sm:w-7"
          >
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2 pl-[66px] sm:w-auto sm:flex-none sm:flex-col sm:items-end sm:pl-0">
        <Select
          ariaLabel="Change status"
          value={entry.status}
          align="right"
          className="w-36"
          options={TABS.map((t) => ({ value: t.value, label: t.label }))}
          onValueChange={(v) => setStatus(entry.id, v as WatchStatus)}
        />
        <button
          type="button"
          onClick={() => remove(entry.id)}
          className="text-xs text-muted transition-colors hover:text-accent"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

interface SeriesBlockProps extends Omit<RowProps, "entry"> {
  group: SeriesGroup;
  open: boolean;
  onToggle: () => void;
}

function SeriesBlock({
  group,
  open,
  onToggle,
  setProgress,
  setStatus,
  remove,
}: SeriesBlockProps) {
  const { items } = group;
  // Franchise name: the shortest title in the group is usually the base season.
  const seriesTitle = items.reduce((a, b) =>
    b.title.length < a.title.length ? b : a,
  ).title;
  const cover = items[0].cover; // earliest season as the series face
  const totalProgress = items.reduce((s, i) => s + i.progress, 0);
  const allKnown = items.every((i) => i.episodes !== null);
  const totalEpisodes = items.reduce((s, i) => s + (i.episodes ?? 0), 0);

  return (
    <div className="py-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 text-left"
      >
        <span className="relative h-[72px] w-[50px] flex-none overflow-hidden border border-line bg-surface">
          {cover ? (
            <Image src={cover} alt="" fill sizes="50px" className="object-cover" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base text-ink">
            {seriesTitle}
          </span>
          <span className="mt-1 block text-xs text-muted">
            {items.length} seasons · {totalProgress} /{" "}
            {allKnown ? totalEpisodes : "?"} watched
          </span>
        </span>
        <i
          className={`ti ti-chevron-down flex-none text-lg text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-l border-line pl-4 sm:pl-5">
          {items.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              setProgress={setProgress}
              setStatus={setStatus}
              remove={remove}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
