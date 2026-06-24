"use client";

import { useEffect } from "react";
import { useStore, type PersistedState } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";

const PUSH_DELAY = 1500;

export function AutoSync() {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSynced = useStore.getState().updatedAt;
    let aborted = false;

    const push = (state: ReturnType<typeof useStore.getState>) => {
      const payload = { ...state.exportState(), syncCode: state.syncCode };
      return fetch(`/api/sync/${state.syncCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    };

    // Pull the latest cloud blob and reconcile against local state by
    // updatedAt (whole-list last-write-wins, matching the sync design).
    const reconcile = () => {
      const code = useStore.getState().syncCode;
      if (!code) return;
      fetch(`/api/sync/${code}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { data?: PersistedState } | null) => {
          if (aborted || !body?.data) return;
          const cloud = body.data;
          const local = useStore.getState();
          if (local.syncCode !== code) return; // code changed mid-flight
          const cloudAt = cloud.updatedAt ?? 0;
          if (cloudAt > local.updatedAt) {
            lastSynced = cloudAt; // set before replaceAll so the push below skips
            local.replaceAll({ ...cloud, syncCode: code });
          } else if (local.updatedAt > cloudAt) {
            lastSynced = local.updatedAt;
            push(local).catch(() => {});
          } else {
            lastSynced = local.updatedAt;
          }
        })
        .catch(() => {
          /* best-effort */
        });
    };

    // Adopt cloud state (or seed it) as soon as we load with a code set.
    reconcile();

    // Push local edits to the cloud, debounced.
    const unsub = useStore.subscribe((state) => {
      if (!state.syncCode || state.updatedAt === lastSynced) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useStore.getState();
        if (!s.syncCode) return;
        lastSynced = s.updatedAt;
        push(s).catch(() => {
          /* best-effort; manual push remains available */
        });
      }, PUSH_DELAY);
    });

    // Pull again when the tab regains focus, to catch edits from other devices.
    const onVisible = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      aborted = true;
      if (timer) clearTimeout(timer);
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [hydrated]);

  return null;
}
