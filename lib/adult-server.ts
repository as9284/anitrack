import { cookies } from "next/headers";
import { ADULT_COOKIE } from "./adult";

// Resolve the adult-content preference for API route handlers. The native app
// has no cookies, so it passes `?adult=1`; web callers fall back to the cookie.
export async function resolveAllowAdult(
  searchParams: URLSearchParams,
): Promise<boolean> {
  const param = searchParams.get("adult");
  if (param !== null) return param === "1" || param === "true";
  return (await cookies()).get(ADULT_COOKIE)?.value === "1";
}
