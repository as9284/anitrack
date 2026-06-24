# AniTrack

A calm, editorial anime tracker — upcoming episodes, live countdowns, seasonal
charts (LiveChart-style), a weekly timetable, and a personal watchlist. No
accounts: tracking is local-first with optional code-based cloud sync.

Built with Next.js (App Router) + Tailwind, data from the free AniList GraphQL
API, sync via Upstash Redis. Design language and full plan in [PLAN.md](PLAN.md).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Environment

Create `.env.local` (already present locally, gitignored):

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Only cloud sync needs these — the rest of the app runs without them.

## What works

- **Home** — seasonal lead + your "Up next" list with live countdowns.
- **Seasons** (`/seasons`) — browse any season/year, paginated.
- **Schedule** (`/schedule`) — the next 7 days of airings in your local time.
- **Detail** (`/anime/[id]`) — synopsis, facts, relations, add-to-list with
  status + per-episode progress.
- **Search** (`/search`) — debounced AniList search.
- **Library** (`/library`) — status buckets (Watching / Plan / Completed /
  Dropped) with progress controls.
- **Settings** (`/settings`) — theme, adult-content toggle, cloud sync
  (enable/code/pull/push), and JSON export/import.
- **PWA** — installable, offline app shell (service worker active in production
  builds only).

## Notes

- Adult content is filtered by default; opt in under Settings (stored in a
  cookie so server-side queries respect it).
- Sync codes are private but unguessable — anyone with a code can read/overwrite
  that list. Rotate the shared Upstash token in the Upstash console once done
  testing.

## Deploy (Vercel)

Push to a Git repo, import into Vercel, add the two `UPSTASH_*` env vars in the
project settings. No other configuration needed.
