# CLAUDE.md

This project's contributor and agent guidance lives in **[AGENTS.md](AGENTS.md)**
— treat it as the source of truth. It is imported below so it always applies.

@AGENTS.md

## Quick reminders

- Done means `npm run lint` and `npm run build` both pass with **zero errors and
  zero warnings**.
- Use the custom form primitives in `components/ui/` (`Select`, `Checkbox`) —
  never native `<select>` / `<input type="checkbox">`.
- Style only with the design tokens (`bg`, `surface`, `ink`, `muted`, `line`,
  `accent`); both light and dark must work.
- Mind the Next 16 async `cookies()`/`params`/`searchParams` and the strict
  `react-hooks` purity / set-state-in-effect rules.
