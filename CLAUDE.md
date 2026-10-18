# movie-recom

Movie recommendation web app. **Status:** MVP built: landing page, required sign-in, one-step onboarding (favourites picker, min 3), recommendations with reasons, search and feedback, a watchlist, a "My films" page, and an installable PWA shell with a bottom tab bar. Movie data comes from TMDB. There is no test suite.

**What we're building and why:** [PRODUCT.md](PRODUCT.md). Read it before changing product behaviour.

This file is the **hub**: it holds the rules that apply to every task and links to **spoke** docs in [docs/](docs/) for detail. Read the spoke that matches your task before changing code in that area.

## Stack at a glance

- Next.js **16.4.2** (App Router, Turbopack) · React **19.3** · TypeScript 5 (strict)
- Tailwind CSS **v4**, loaded through `@tailwindcss/turbopack` (no PostCSS config)
- **UI:** shadcn/ui (`base-nova`, Base UI primitives) themed from [DESIGN.md](DESIGN.md) — dark only
- **Auth:** Supabase (`@supabase/ssr`) — auth only
- **Database:** Supabase Postgres via **Drizzle ORM** — never `supabase.from()`
- Package manager: **bun** 1.3.2
- ESLint 9 flat config with `eslint-config-next`

## Rules that always apply

1. **This is not the Next.js in your training data.** Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (version-matched to the installed release). Heed deprecation notices.
2. **Cache Components is on.** Data fetching is dynamic by default; opt into caching with `"use cache"`. Do not add a `runtime` route segment export. See [docs/nextjs-16.md](docs/nextjs-16.md).
3. **Use bun**, not npm/yarn/pnpm, for installs and scripts.
4. **Server Components by default.** Add `"use client"` only for interactivity or browser APIs.
5. **Import via the `@/` alias** (maps to the repo root).
6. **Supabase is for auth only; all data access goes through Drizzle.** See [docs/auth.md](docs/auth.md) and [docs/database.md](docs/database.md).
7. **Mobile-first, always.** Design every screen for a ~390px phone first, then scale up. Keep flows simple: tap over type, one obvious next step.
8. **[DESIGN.md](DESIGN.md) is the design system.** All UI follows its tokens and component specs; it wins over existing code.
9. **Use shadcn/ui components; don't build components from scratch.** Install with `bunx --bun shadcn@latest add <name>` and compose/restyle them. See [docs/styling.md](docs/styling.md).
10. **Always use the `/impeccable` skill for UI generation** — new screens, components, and visual changes.
11. Run `bun run lint` and `bun run build` before declaring work done — there is no test suite yet.

## Commands

```bash
bun install        # install deps
bun dev            # dev server on http://localhost:3000
bun run build      # production build (also type-checks)
bun run start      # serve the production build
bun run lint       # eslint
bun run db:generate  # generate a migration from lib/db/schema.ts
bun run db:migrate   # apply migrations
```

## Spokes

| Doc | Read it when you are… |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | adding routes, components, or data fetching; deciding where code lives |
| [docs/nextjs-16.md](docs/nextjs-16.md) | touching `next.config.ts`, caching, prefetching, layouts/pages typing |
| [docs/styling.md](docs/styling.md) | writing any UI: DESIGN.md → token mapping, adding shadcn components, type scale, radius |
| [docs/auth.md](docs/auth.md) | touching sign-in/out, sessions, `proxy.ts`, or checking who the user is |
| [docs/recommendations.md](docs/recommendations.md) | touching TMDB calls, the recommendation engine, its weights, or the user's movie list |
| [docs/database.md](docs/database.md) | adding tables, writing queries, or running migrations |
| [docs/development.md](docs/development.md) | setting up, running, linting, building, or managing dependencies |

## Keeping docs current

- When you add a subsystem (data source, recommendation engine, auth, tests…), create a new spoke in `docs/` and add a row to the table above.
- Keep this hub short: rules that apply to *every* task live here; everything else goes in a spoke.
- `next dev` may generate an `AGENTS.md` with Next.js-managed blocks. Leave those blocks intact and commit the file.
