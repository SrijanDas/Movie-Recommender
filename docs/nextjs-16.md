# Next.js 16 specifics

← Back to [CLAUDE.md](../CLAUDE.md)

The installed Next.js (16.4.2) has APIs and defaults that differ from older versions. The authoritative reference is the bundled copy at `node_modules/next/dist/docs/` — check it before relying on memory.

Useful entry points:

| Topic | Path under `node_modules/next/dist/docs/01-app/` |
| --- | --- |
| Caching model | `01-getting-started/08-caching.md` |
| `"use cache"` directive | `03-api-reference/01-directives/` |
| Config options | `03-api-reference/05-config/01-next-config-js/` |
| Server/client components | `01-getting-started/05-server-and-client-components.md` |
| Upgrade notes | `02-guides/upgrading/` |

## What `next.config.ts` enables

| Option | Effect |
| --- | --- |
| `cacheComponents: true` | Data fetching is **dynamic by default**. Cache explicitly with `"use cache"`, tuned by `cacheLife()` and invalidated via `cacheTag()`. Partial Prerendering is the default: a static shell is served immediately and dynamic parts stream in. Uses React `<Activity>` to preserve component state across client navigations. |
| `partialPrefetching: true` | `<Link>` prefetches only the static parts of a route by default. Set `prefetch={true}` on a link to fetch more. Requires `cacheComponents`. |
| `experimental.agentFeedback: true` | `next dev` writes a managed block into `AGENTS.md` asking coding agents to collect anonymized Next.js friction reports. Leave the block in place. |
| `turbopack.rules["*.css"]` | Runs CSS through `@tailwindcss/turbopack` — this is how Tailwind is wired up (see [styling.md](styling.md)). |

## Gotchas

- **No `runtime` export.** Cache Components requires the Node.js runtime; `export const runtime = ...` (including `'nodejs'` or `'edge'`) is unsupported.
- **Legacy flags are gone.** Don't add `experimental.ppr`, `experimental_ppr`, `experimental.dynamicIO`, or `experimental.useCache`.
- **Uncached dynamic data must sit inside `<Suspense>`** (or a `loading.tsx`), otherwise the build errors about blocking the static shell.
- **Typed route helpers are global.** `LayoutProps<"/">` and `PageProps<"/route">` are generated types — use them instead of hand-writing `{ children, params }` types. `params`/`searchParams` are Promises; `await` them.
- `next-env.d.ts` is generated and gitignored; don't edit it.
