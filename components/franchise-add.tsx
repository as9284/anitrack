"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { WATCH_STATUSES } from "@/lib/constants";
import { statusLabel } from "@/lib/utils";
import type { RelationEntry, WatchStatus } from "@/lib/types";

// Relation types that represent watchable entries in the same franchise.
const FRANCHISE_TYPES = new Set([
  "SEQUEL",
  "PREQUEL",
  "SIDE_STORY",
  "PARENT",
  "ALTERNATIVE",
  "SPIN_OFF",
]);

interface FranchiseAddProps {
  relations: RelationEntry[];
}

export function FranchiseAdd({ relations }: FranchiseAddProps) {
  const hydrated = useHydrated();
  const quickAddMany = useStore((s) => s.quickAddMany);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WatchStatus>("completed");
  const [selected, setSelected] = useState<Set<number>>(
    () =>
      new Set(
        relations
          .filter((r) => FRANCHISE_TYPES.has(r.relationType))
          .map((r) => r.id),
      ),
  );
  const [message, setMessage] = useState<string | null>(null);

  if (!hydrated || relations.length === 0) return null;

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = () => {
    const chosen = relations.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    quickAddMany(chosen, status);
    const label =
      WATCH_STATUSES.find((s) => s.value === status)?.label ?? "list";
    setMessage(
      `Added ${chosen.length} ${chosen.length === 1 ? "entry" : "entries"} as ${label}.`,
    );
    setOpen(false);
  };

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs uppercase tracking-wider text-muted transition-colors hover:border-ink hover:text-ink"
      >
        <i className="ti ti-stack-2" aria-hidden="true" /> Add related to list
      </button>

      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}

      {open ? (
        <div className="mt-3 border border-line p-4">
          <ul className="divide-y divide-line">
            {relations.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggle(r.id)}
                  ariaLabel={`Select ${r.title}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="kicker">{statusLabel(r.relationType)}</p>
                  <p className="truncate text-sm text-ink">{r.title}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted">
                  {r.episodes ? `${r.episodes} eps` : "—"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs uppercase tracking-wider text-muted">
              Add {selected.size} as
            </span>
            <div className="flex items-center gap-2">
              <Select
                ariaLabel="Status for related titles"
                value={status}
                onValueChange={(v) => setStatus(v as WatchStatus)}
                options={WATCH_STATUSES}
                align="right"
              />
              <button
                type="button"
                onClick={add}
                disabled={selected.size === 0}
                className="whitespace-nowrap border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-wider text-bg transition-colors hover:border-accent hover:bg-accent disabled:opacity-50"
              >
                Add {selected.size}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
