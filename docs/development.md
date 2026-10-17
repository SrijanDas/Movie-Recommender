# Development workflow

← Back to [CLAUDE.md](../CLAUDE.md)

## Tooling

- **bun 1.3.2** is the package manager (`packageManager` in `package.json`). Use `bun add` / `bun add -d` / `bun remove`; don't create `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- `sharp` and `unrs-resolver` are listed under `trustedDependencies` so their install scripts run under bun.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | `next dev` with Turbopack on port 3000 |
| `bun run build` | production build; also runs type-checking |
| `bun run start` | serve the build output |
| `bun run lint` | ESLint (flat config in `eslint.config.mjs`) |

## TypeScript

- `strict: true`, `moduleResolution: "bundler"`, `noEmit` (Next compiles).
- Path alias `@/*` → repo root.
- Generated route types live under `.next/types` and `.next/dev/types`; run `bun dev` or `bun run build` once if `LayoutProps`/`PageProps` show as missing.

## Linting

`eslint.config.mjs` extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, ignoring `.next/`, `out/`, `build/`, and `next-env.d.ts`.

## Before finishing a change

1. `bun run lint` passes.
2. `bun run build` passes (catches type errors and Cache Components prerender errors).
3. For UI changes, check the page in `bun dev` in both light and dark mode.

There is no test suite yet. When one is added, document it here and add the test command to the hub.

## Environment variables

Put secrets in `.env.local` (gitignored via `.env*`). Only `NEXT_PUBLIC_`-prefixed variables are exposed to the browser. List each required variable here when introduced.
