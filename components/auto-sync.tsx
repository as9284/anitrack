"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function AutoSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastPushed = useStore.getState().updatedAt;

    const unsub = useStore.subscribe((state) => {
      if (!state.syncCode || state.updatedAt === lastPushed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useStore.getState();
        if (!s.syncCode) return;
        lastPushed = s.updatedAt;
        const payload = { ...s.exportState(), syncCode: s.syncCode };
        fetch(`/api/sync/${s.syncCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {
          /* best-effort; manual push remains available */
        });
      }, 1500);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  return null;
}
