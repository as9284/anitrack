# AGENTS.md

Guidance for AI agents and contributors working in this repository. This is the
source of truth for how AniTrack is built and the conventions to follow.

## Project

AniTrack is an anime tracker: upcoming episodes, airing countdowns, seasonal
charts (LiveChart-style), a weekly timetable, and a personal watchlist. It has
**no accounts** — tracking is local-first (localStorage) with optional
code-based cloud sync. See [PLAN.md](PLAN.md) for the original plan and design
rationale.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**, TypeScript
- **Tailwind CSS 3** with CSS-variable design tokens
- **Zustand 5** (+ `persist`) for local watchlist state
- **Upstash Redis** (`@upstash/redis`) for cloud sync
- **next-themes** for light/dark
- Data: **AniList GraphQL** (`https://graphql.anilist.co`, no API key)
- PWA via a hand-written service worker (`public/sw.js`)
- Deployed on **Vercel** at `anitrack.asaliba.net`, from `main`

## Commands

```bash
npm run dev      # local dev (http://localhost:3000)
npm run build    # production build (also type-checks)
npm run start    # serve the production build
npm run lint     # ESLint (flat config)
```

**Definition of done for any change: `npm run lint` AND `npm run build` both
exit 0 with zero errors and zero warnings.** This is a hard requirement — do not
finish with outstanding warnings.

## Architecture

Local-first. The watchlist always lives in the browser (`lib/store.ts`,
Zustand + localStorage) and works offline. AniList is read-only reference data.
Upstash is an optional push/pull mirror keyed by a private sync code.

```
Browser (PWA, local-first)
  ├─ Zustand store + localStorage   ← canonical user state
  ├─ next-themes                    ← light/dark
  └─ fetch → Route Handlers (app/api/*)
                ├─ /api/airing      ← next-episode data for tracked ids
                ├─ /api/meta        ← genres/duration for stats
                ├─ /api/recommend   ← AniList recommendations for tracked ids
                ├─ /api/taste       ← tags/studios/shape for tracked ids
                ├─ /api/discover    ← one candidate pool per term (see below)
                ├─ /api/import       ← import a list by AniList username
                ├─ /api/sync/[code] ← Upstash GET/SET (JSON blob)
                └─ /api/push/*      ← episode notifications (see below)
```

### Discover

Personalised recommendations with a stated reason for every shelf. The taste
profile is built and scored **in the browser** (`lib/taste.ts`, pure functions)
so preferences never leave the device.

```
watchlist → /api/taste?ids=…        ← tags/genres/studios for tracked titles
          → buildProfile()          ← weighted tag/genre/studio vectors
          → planPools()             ← which terms to fetch
          → /api/discover?mode=…&q= ← one pool per term, 4 requests at a time
          → rankCandidates()        ← cosine similarity + quality/novelty/fit
          → buildShelves()          ← each shelf carries its justification
```

- There are no user ratings, so "liked" is inferred: completed is the positive
  signal, dropped the negative one, scaled by *where* it was dropped — bailing
  at episode one is a much louder no than quitting at episode 20.
- Seeds (the "Because you finished X" shelves and the recs batch) are ordered
  by weight, then **most recently updated**, and the window rotates daily. Every
  completed show weighs the same, and the store is a `Record<number, …>` that
  iterates in ascending AniList id, so without both of those the oldest show on
  the list (Death Note, id 1535) fronted the page permanently. Recs are also
  returned once per seed rather than collapsed to the best-voted seed, which
  otherwise hands every overlap to the most popular title.
- **Pools are fetched one term at a time on purpose.** Each URL is a
  profile-independent cache key shared by every visitor, so nothing sent to
  the server describes a whole person's taste.
- Candidates already tracked are dropped, as are later seasons whose prequel
  the user hasn't started (`prequelIds`, from the inlined `relations` edges).
- Cast/Demographic/Technical tags ("Male Protagonist", "Shounen", "CGI") still
  count toward similarity but are never allowed to name a shelf or drive a
  query — they describe almost everything, so they explain nothing.
- A shelf that can't reach 4 items is dropped rather than padded.

### Episode notifications

Opt-in Web Push, per device. This is the one place where user state lives
server-side: to notify while the app is closed, Upstash has to hold the push
subscription plus the ids to watch. It stays anonymous — keyed by a hash of the
push endpoint, no account, independent of cloud sync.

```
Settings toggle → pushManager.subscribe()
      → POST /api/push/subscribe   ← {endpoint, keys, ids, lead} in Upstash
components/push-sync.tsx           ← re-POSTs ids whenever "watching" changes

QStash cron (*/5) → POST /api/push/dispatch
      → verify Upstash-Signature → read all subs → batch AniList airing query
      → for each (sub, media) inside its lead window: NX-claim, web-push send
```

- Notify on **"watching" entries only**; `watchingIds()` in `lib/push-client.ts`
  is the single definition of that.
- Dedupe is an `SET NX EX` claim per `(sub, media, episode)` — overlapping ticks
  can't double-send. A transient send failure releases the claim so the next
  tick retries; a 404/410 from the push service prunes the subscription.
- Polling beats scheduling one message per episode: a show on hiatus has
  `nextAiringEpisode: null`, so a chain of delayed messages would have nothing
  to reschedule from and would silently die. The poll self-heals.
- The service worker only registers in production, so notifications cannot be
  tested with `npm run dev` — use `npm run build && npm run start`.

Countdowns are computed **client-side** from AniList's `airingAt` UNIX
timestamp (see `components/countdown.tsx` + `lib/hooks.ts` `useNow`). One fetch,
live ticking — never poll AniList for countdowns.

## Directory map

- `app/` — App Router pages, route handlers, `loading.tsx` skeletons,
  `opengraph-image.tsx`, `manifest.ts`, `icon.svg`.
- `components/` — shared components. `components/ui/` holds the form primitives
  (`select.tsx`, `checkbox.tsx`).
- `lib/` — `anilist.ts` (all GraphQL), `store.ts` (Zustand), `types.ts`,
  `utils.ts`, `season.ts`, `constants.ts`, `adult.ts`, `redis.ts`, `hooks.ts`.

## Design system — minimal editorial

Calm, airy, premium print-guide aesthetic. Locked; do not redesign without being
asked. Full spec in [PLAN.md](PLAN.md) §7.

- **Type**: Fraunces serif (`font-serif`) for the wordmark, all titles, and big
  numbers; sans (`font-sans`) for body/metadata. Uppercase letter-spaced
  micro-labels use the `.kicker` class.
- **Color tokens** (CSS vars in `app/globals.css`, mapped in
  `tailwind.config.ts`): `bg`, `surface`, `ink` (text), `muted`, `line`
  (borders), `accent` (muted clay). Use these Tailwind classes (`text-ink`,
  `border-line`, `bg-surface`, `text-accent`, …) — never hardcode hex.
  Opacity modifiers work (tokens are RGB channels): `bg-bg/90` etc.
- **Accent is used sparingly** — airing-soon indicators, active states, primary
  actions. Mostly ink/paper + hairline `border-line` rules.
- **Both light and dark are first-class.** Mental test: would it read on
  near-black? Always use tokens so it adapts.
- Skeletons use the `.skeleton` class (tuned `--sk-base`/`--sk-shine` shimmer,
  respects `prefers-reduced-motion`). Each route has a layout-accurate
  `loading.tsx`.

### Form primitives (IMPORTANT)

Do **not** use native `<select>` or `<input type="checkbox">` in the UI. Use the
custom primitives so everything matches the design and theming:

- `components/ui/select.tsx` — `<Select value options onValueChange ariaLabel />`
  (keyboard-navigable, click-outside close, `align` left/right).
- `components/ui/checkbox.tsx` — `<Checkbox checked onCheckedChange ariaLabel />`.

Plain text `<input>` is fine (search box, sync code, username).

## Coding conventions & gotchas

These are the things that most often cause build/lint failures here.

1. **Next 16 async dynamic APIs.** `cookies()`, `params`, and `searchParams`
   are Promises — always `await` them in pages/route handlers.

2. **Strict `react-hooks` rules (eslint-plugin-react-hooks v6) are on:**
   - `react-hooks/set-state-in-effect`: never call `setState` synchronously in
     an effect body. For hydration use `useHydrated()` (built on
     `useSyncExternalStore`, in `lib/hooks.ts`), not a `setState`-in-effect.
     Effects that fetch should only `setState` inside `.then`.
   - `react-hooks/purity`: no `Date.now()` / `Math.random()` during render. Use
     `nowSeconds()` (server, `lib/utils.ts`) or the `useNow()` hook (client).

3. **Zero unused vars / unescaped entities.** Escape apostrophes/quotes in JSX
   (`&apos;`, `&ldquo;`). Use `catch {}` (no binding) when the error is unused.

4. **Images**: always `next/image`; remote hosts must be in
   `next.config.mjs` `images.remotePatterns` (currently `s4.anilist.co`,
   `img.anili.st`, `i.ytimg.com`).

5. **AniList `isAdult` filter**: passing `isAdult: null` returns **nothing**.
   To include adult content, OMIT the filter; only add `isAdult: false` to hide
   it. See `filterClause`/`getSeason` in `lib/anilist.ts`. The toggle is stored
   in the `allow_adult` cookie (read server-side via `lib/adult.ts`).

6. **AniList caching**: every query goes through `aniFetch` with a `revalidate`
   (seasons 24h, schedule 1h, detail 6h, search 60s, user-list 0). AniList is
   rate-limited — keep server-side caching; don't fetch per keystroke server-side.
   The observed budget is **30 requests/minute** (it degrades to that from 90),
   which is easy to blow: `getSeasonCount` alone paginates a whole season. Fan
   out in small batches, never all at once (see `POOL_CONCURRENCY` in
   `lib/discover-fetch.ts`). `aniFetch` does not retry a 429 — it throws, and
   callers that swallow it turn a rate-limit into silently missing content.

7. **AniList `tag_in` / `genre_in` are AND, not OR.**
   `tag_in: ["Time Loop", "Iyashikei"]` matches titles carrying *both* and
   returns nothing. Use the singular `tag:` / `genre:` args and issue one query
   per term. Relatedly, `Media.tags` takes no `sort` argument — it already
   comes back rank-descending — and `tags { category }` is what distinguishes
   a meaningful theme from a near-universal one.

8. **No accounts**: never add auth. Personal state is local; sync is by code
   only and anyone with a code can read/write that blob (documented in UI).

## Verification workflow

After changes, run `npm run lint` and `npm run build` (must be clean). For
behavioral changes, `npm run start` and smoke-test the affected routes/APIs.
When touching AniList queries, validate the exact response shape against
`https://graphql.anilist.co` before writing the parser — field args differ from
expectations (e.g. `recommendations` takes `mediaId`, not `mediaId_in`).

## Environment

`.env.local` (gitignored). Upstash creds are needed by cloud sync and
notifications; the rest are notifications only:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Web Push — generate once with `npx web-push generate-vapid-keys`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

# QStash — copy from the Upstash console (QStash → Signing keys)
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

All of these must also be set in the Vercel project, and the same VAPID keypair
must be kept forever — rotating it invalidates every existing subscription.

The recurring dispatch is a QStash schedule (Upstash console → QStash →
Schedules), `*/5 * * * *` → `POST https://<site>/api/push/dispatch`. Without it
subscriptions are stored but nothing is ever sent.

`NEXT_PUBLIC_SITE_URL` is optional. `lib/site.ts` holds the origin in one place
and already falls back to the production domain, so OG/Twitter image URLs and the
calendar feed stay absolute without it. Change the fallback rather than relying on
the variable: the fallback is what ships whenever configuration is forgotten, and
a wrong one points `metadataBase` (and therefore `rel=canonical`) at a domain the
site no longer uses.

**Hosting constraint:** AniList blocks Cloudflare Workers egress IPs as a class
(`403 "You have been manually blocked"`), and the route handlers swallow it into
empty results, so the symptom is a site that renders perfectly with no anime in
it. Verified 2026-09-17. Any host must have non-shared egress.
