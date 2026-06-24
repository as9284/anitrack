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
- Deployed on **Vercel**

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
                ├─ /api/import       ← import a list by AniList username
                └─ /api/sync/[code] ← Upstash GET/SET (JSON blob)
```

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

7. **No accounts**: never add auth. Personal state is local; sync is by code
   only and anyone with a code can read/write that blob (documented in UI).

## Verification workflow

After changes, run `npm run lint` and `npm run build` (must be clean). For
behavioral changes, `npm run start` and smoke-test the affected routes/APIs.
When touching AniList queries, validate the exact response shape against
`https://graphql.anilist.co` before writing the parser — field args differ from
expectations (e.g. `recommendations` takes `mediaId`, not `mediaId_in`).

## Environment

`.env.local` (gitignored) holds Upstash creds; only cloud sync needs them:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Set `NEXT_PUBLIC_SITE_URL` in production so OG/Twitter image URLs are absolute.
