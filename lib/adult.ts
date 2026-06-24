export const ADULT_COOKIE = "allow_adult";
const ADULT_EVENT = "anitrack:adult-change";

export function setAdultCookie(allow: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${ADULT_COOKIE}=${allow ? "1" : "0"}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new Event(ADULT_EVENT));
}

export function readAdultCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${ADULT_COOKIE}=1`);
}

export function subscribeAdult(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ADULT_EVENT, callback);
  return () => window.removeEventListener(ADULT_EVENT, callback);
}
