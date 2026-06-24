"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { Select } from "@/components/ui/select";
import { WATCH_STATUSES } from "@/lib/constants";
import { formatLabel } from "@/lib/utils";
import type { ImportEntry, MediaCard, WatchStatus } from "@/lib/types";

interface TitleMatch {
  query: string;
  candidates: MediaCard[];
}

export function PasteImport() {
  const importEntries = useStore((s) => s.importEntries);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<TitleMatch[] | null>(null);
  const [chosen, setChosen] = useState<(number | null)[]>([]);
  const [status, setStatus] = useState<WatchStatus>("completed");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const findMatches = async () => {
    const titles = Array.from(
      new Set(
        text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      ),
    ).slice(0, 50);

    if (titles.length === 0) {
      setMessage("Paste at least one title, one per line.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });
      if (!res.ok) {
        setMessage("Couldn't match those titles. Please try again.");
        return;
      }
      const data = (await res.json()) as { matches: TitleMatch[] };
      setMatches(data.matches);
      setChosen(data.matches.map((m) => m.candidates[0]?.id ?? null));
    } catch {
      setMessage("Matching failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const addAll = () => {
    if (!matches) return;
    const seen = new Set<number>();
    const entries: ImportEntry[] = [];
    matches.forEach((m, i) => {
      const id = chosen[i];
      if (id == null || seen.has(id)) return;
      const cand = m.candidates.find((c) => c.id === id);
      if (!cand) return;
      seen.add(id);
      entries.push({
        id: cand.id,
        status,
        progress: status === "completed" ? (cand.episodes ?? 0) : 0,
        title: cand.title,
        cover: cand.cover,
        episodes: cand.episodes,
        format: cand.format,
      });
    });

    if (entries.length === 0) {
      setMessage("Nothing selected to add.");
      return;
    }

    importEntries(entries);
    const label =
      WATCH_STATUSES.find((s) => s.value === status)?.label ?? "list";
    setMatches(null);
    setChosen([]);
    setText("");
    setMessage(`Added ${entries.length} titles as ${label}.`);
  };

  const reset = () => {
    setMatches(null);
    setChosen([]);
    setMessage(null);
  };

  const includedCount = chosen.filter((id) => id != null).length;

  return (
    <div>
      <p className="mt-1 text-sm text-muted">
        No account anywhere? Paste your watched titles — one per line — and
        we&apos;ll match each against AniList so you can add them in bulk.
      </p>

      {!matches ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"Fullmetal Alchemist: Brotherhood\nSteins;Gate\nCowboy Bebop"}
            className="w-full resize-y border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            disabled={busy}
            onClick={findMatches}
            className="border border-ink px-4 py-2 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
          >
            {busy ? "Matching…" : "Find matches"}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
            <span className="text-xs uppercase tracking-wider text-muted">
              Add {includedCount} as
            </span>
            <div className="flex items-center gap-2">
              <Select
                ariaLabel="Status for imported titles"
                value={status}
                onValueChange={(v) => setStatus(v as WatchStatus)}
                options={WATCH_STATUSES}
              />
              <button
                type="button"
                onClick={addAll}
                className="whitespace-nowrap border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-wider text-bg transition-colors hover:border-accent hover:bg-accent"
              >
                Add {includedCount}
              </button>
              <button
                type="button"
                onClick={reset}
                className="border border-line px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
              >
                Back
              </button>
            </div>
          </div>

          <ul className="divide-y divide-line border-b border-line">
            {matches.map((m, i) => {
              const id = chosen[i];
              const cand = m.candidates.find((c) => c.id === id) ?? null;
              const options = [
                ...m.candidates.map((c) => ({
                  value: String(c.id),
                  label: c.seasonYear
                    ? `${c.title} (${c.seasonYear})`
                    : c.title,
                })),
                { value: "", label: "Skip this title" },
              ];
              return (
                <li
                  key={`${m.query}-${i}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="relative h-14 w-10 flex-none overflow-hidden border border-line bg-surface">
                    {cand?.cover ? (
                      <Image
                        src={cand.cover}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-muted">
                        <i className="ti ti-question-mark" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted">
                      You typed: {m.query}
                    </p>
                    {m.candidates.length === 0 ? (
                      <p className="mt-1 text-sm text-accent">No match found</p>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <Select
                          ariaLabel={`Match for ${m.query}`}
                          value={id == null ? "" : String(id)}
                          onValueChange={(v) =>
                            setChosen((prev) => {
                              const next = [...prev];
                              next[i] = v === "" ? null : Number(v);
                              return next;
                            })
                          }
                          options={options}
                          className="min-w-0 flex-1"
                        />
                        {cand ? (
                          <span className="hidden whitespace-nowrap text-xs text-muted sm:inline">
                            {formatLabel(cand.format)}
                            {cand.episodes ? ` · ${cand.episodes} eps` : ""}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-sm text-accent">{message}</p>
      ) : null}
    </div>
  );
}
