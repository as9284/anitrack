export interface IcsEvent {
  uid: string;
  start: number;
  durationMin: number;
  summary: string;
  description?: string;
  url?: string;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function toUtc(seconds: number): string {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function fold(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > 75) {
      chunks.push(current);
      current = " " + char;
    } else {
      current += char;
    }
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n");
}

export function buildIcs(name: string, events: IcsEvent[], stamp: number): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AniTrack//Airing Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    // Hints for subscribers (Google/Apple) on how often to re-fetch.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  const stampUtc = toUtc(stamp);

  // Duplicate UIDs in one VCALENDAR are invalid and make some clients drop the
  // whole feed, so keep the first occurrence of each and emit in time order.
  const seen = new Set<string>();
  const unique = events.filter((event) => {
    if (!Number.isFinite(event.start) || seen.has(event.uid)) return false;
    seen.add(event.uid);
    return true;
  });
  unique.sort((a, b) => a.start - b.start);

  for (const event of unique) {
    const minutes =
      Number.isFinite(event.durationMin) && event.durationMin > 0
        ? Math.min(Math.round(event.durationMin), 24 * 60)
        : 24;
    const end = event.start + minutes * 60;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stampUtc}`,
      `DTSTART:${toUtc(event.start)}`,
      `DTEND:${toUtc(end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      // Airing episodes shouldn't make you look busy.
      "TRANSP:TRANSPARENT",
      "STATUS:CONFIRMED",
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
