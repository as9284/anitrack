"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import {
  getExistingSubscription,
  pushSupported,
  readLead,
  saveSubscription,
  watchingIds,
} from "@/lib/push-client";

const PUSH_DELAY = 2000;

/**
 * Mirrors the "watching" ids to the server whenever the watchlist changes, so
 * the dispatcher always alerts on the current list. No-op unless this device
 * has already opted into notifications.
 */
export function PushSync() {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated || !pushSupported()) return;

    let aborted = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    getExistingSubscription()
      .then((subscription) => {
        if (aborted || !subscription) return;

        let last = watchingIds(useStore.getState().entries).join(",");

        unsub = useStore.subscribe((state) => {
          const ids = watchingIds(state.entries);
          const key = ids.join(",");
          if (key === last) return;
          last = key;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            saveSubscription(subscription, ids, readLead()).catch(() => {
              /* best-effort; settings offers a manual re-save */
            });
          }, PUSH_DELAY);
        });
      })
      .catch(() => {
        /* no subscription on this device */
      });

    return () => {
      aborted = true;
      if (timer) clearTimeout(timer);
      if (unsub) unsub();
    };
  }, [hydrated]);

  return null;
}
