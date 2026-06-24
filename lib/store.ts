"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaCard, WatchStatus } from "./types";

export interface WatchEntry {
  id: number;
  status: WatchStatus;
  progress: number;
  title: string;
  cover: string;
  episodes: number | null;
  format: string | null;
  addedAt: number;
  updatedAt: number;
}

export interface PersistedState {
  version: number;
  entries: Record<number, WatchEntry>;
  syncCode: string | null;
  updatedAt: number;
}

interface StoreState {
  entries: Record<number, WatchEntry>;
  syncCode: string | null;
  updatedAt: number;
  add: (media: CardLike, status?: WatchStatus) => void;
  remove: (id: number) => void;
  setStatus: (id: number, status: WatchStatus) => void;
  setProgress: (id: number, progress: number) => void;
  setSyncCode: (code: string | null) => void;
  replaceAll: (data: PersistedState) => void;
  exportState: () => PersistedState;
}

type CardLike = Pick<
  MediaCard,
  "id" | "title" | "cover" | "episodes" | "format"
>;

const STORAGE_KEY = "anitrack-store-v1";

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      entries: {},
      syncCode: null,
      updatedAt: 0,

      add: (media, status = "planning") =>
        set((state) => {
          const now = Date.now();
          const existing = state.entries[media.id];
          return {
            updatedAt: now,
            entries: {
              ...state.entries,
              [media.id]: {
                id: media.id,
                status: existing?.status ?? status,
                progress: existing?.progress ?? 0,
                title: media.title,
                cover: media.cover,
                episodes: media.episodes,
                format: media.format,
                addedAt: existing?.addedAt ?? now,
                updatedAt: now,
              },
            },
          };
        }),

      remove: (id) =>
        set((state) => {
          const next = { ...state.entries };
          delete next[id];
          return { entries: next, updatedAt: Date.now() };
        }),

      setStatus: (id, status) =>
        set((state) => {
          const entry = state.entries[id];
          if (!entry) return state;
          const now = Date.now();
          return {
            updatedAt: now,
            entries: {
              ...state.entries,
              [id]: { ...entry, status, updatedAt: now },
            },
          };
        }),

      setProgress: (id, progress) =>
        set((state) => {
          const entry = state.entries[id];
          if (!entry) return state;
          const now = Date.now();
          const max = entry.episodes ?? Infinity;
          const clamped = Math.max(0, Math.min(progress, max));
          return {
            updatedAt: now,
            entries: {
              ...state.entries,
              [id]: { ...entry, progress: clamped, updatedAt: now },
            },
          };
        }),

      setSyncCode: (code) => set({ syncCode: code, updatedAt: Date.now() }),

      replaceAll: (data) =>
        set({
          entries: data.entries ?? {},
          syncCode: data.syncCode ?? null,
          updatedAt: data.updatedAt ?? Date.now(),
        }),

      exportState: () => {
        const state = get();
        return {
          version: 1,
          entries: state.entries,
          syncCode: state.syncCode,
          updatedAt: state.updatedAt,
        };
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as PersistedState | undefined;
        if (version < 2 && state?.entries) {
          const migrated: Record<number, WatchEntry> = {};
          for (const key of Object.keys(state.entries)) {
            const id = Number(key);
            const entry = state.entries[id];
            migrated[id] = {
              ...entry,
              addedAt: entry.addedAt ?? entry.updatedAt ?? 0,
            };
          }
          return { ...state, entries: migrated } as unknown as StoreState;
        }
        return state as unknown as StoreState;
      },
    },
  ),
);
