/**
 * The canonical origin, in one place. The fallback is the real production
 * domain rather than a placeholder: it is what ships whenever the env var is
 * forgotten, and a wrong value here quietly tells crawlers to index somewhere
 * else through `metadataBase` and the calendar feed URLs.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anitrack.asaliba.net";
