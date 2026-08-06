"use client";

import type { WatchEntry } from "./store";

export const LEAD_STORAGE_KEY = "anitrack-push-lead";
export const DEFAULT_LEAD = 10;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

/** The ids we alert on: everything currently marked "watching". */
export function watchingIds(entries: Record<number, WatchEntry>): number[] {
  return Object.values(entries)
    .filter((e) => e.status === "watching")
    .map((e) => e.id)
    .sort((a, b) => a - b);
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  // Backed by a concrete ArrayBuffer — BufferSource rejects ArrayBufferLike.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Resolve the active service worker registration. Returns null when none is
 * registered — `navigator.serviceWorker.ready` would hang forever instead
 * (the worker is only registered in production builds).
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export function readLead(): number {
  if (typeof window === "undefined") return DEFAULT_LEAD;
  const raw = window.localStorage.getItem(LEAD_STORAGE_KEY);
  const parsed = raw === null ? NaN : parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_LEAD;
}

export function writeLead(lead: number): void {
  window.localStorage.setItem(LEAD_STORAGE_KEY, String(lead));
}

/** Register (or refresh) this device's subscription on the server. */
export async function saveSubscription(
  subscription: PushSubscription,
  ids: number[],
  lead: number,
): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), ids, lead }),
  });
  if (!res.ok) throw new Error("Subscribe failed");
}

export async function enablePush(
  ids: number[],
  lead: number,
): Promise<PushSubscription> {
  const registration = await getRegistration();
  if (!registration) throw new Error("No service worker");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permission denied");

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await saveSubscription(subscription, ids, lead);
  return subscription;
}

export async function disablePush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {
    /* drop the local subscription regardless */
  });
  await subscription.unsubscribe();
}
