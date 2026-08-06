import { NextResponse } from "next/server";
import {
  discoverByStudio,
  discoverEditorial,
  discoverPool,
  discoverRecs,
} from "@/lib/anilist";
import { resolveAllowAdult } from "@/lib/adult-server";
import type { DiscoverCandidate } from "@/lib/types";

// One candidate pool per request, keyed by a single term. The client fires
// these in parallel for whatever its local taste profile asked for, which
// means each pool is a profile-independent cache key shared by every
// visitor — and the server never sees the combination that identifies a
// particular person's taste.
const MODES = ["tag", "genre", "gems", "studio", "recs", "editorial"] as const;
type Mode = (typeof MODES)[number];

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "";
  const term = searchParams.get("q") ?? "";

  if (!isMode(mode)) {
    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  }
  if (mode !== "editorial" && term.length === 0) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const allowAdult = await resolveAllowAdult(searchParams);

  try {
    let items: DiscoverCandidate[];
    switch (mode) {
      case "recs": {
        const ids = term
          .split(",")
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, 50);
        items = ids.length > 0 ? await discoverRecs(ids, allowAdult) : [];
        break;
      }
      case "studio":
        items = await discoverByStudio(term, allowAdult);
        break;
      case "editorial":
        items = await discoverEditorial(allowAdult);
        break;
      default:
        items = await discoverPool(mode, term, allowAdult);
    }
    return NextResponse.json({ items });
  } catch {
    // A dead pool should thin the page out, not break it.
    return NextResponse.json({ items: [] });
  }
}
