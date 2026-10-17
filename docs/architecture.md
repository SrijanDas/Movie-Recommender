# Architecture

← Back to [CLAUDE.md](../CLAUDE.md)

## Current layout

```
app/
  layout.tsx    # root layout: <html>/<body>, Geist fonts, globals.css
  page.tsx      # "/" — still the create-next-app template
  globals.css   # Tailwind import + theme tokens
  favicon.ico
components/
  ui/           # shadcn/ui components (owned source, added via the shadcn CLI)
components.json # shadcn config
lib/
  utils.ts      # cn() class merging
  auth.ts       # getCurrentUserId() — verified Supabase user id
  supabase/     # auth-only clients: server.ts, client.ts, proxy.ts (session refresh)
  db/           # Drizzle: schema.ts (tables), index.ts (db client)
drizzle/        # generated SQL migrations
proxy.ts        # Next 16 proxy — refreshes the Supabase session
drizzle.config.ts
public/         # static assets served from "/" (template SVGs)
next.config.ts  # framework config — see nextjs-16.md
```

There are no API routes or tables yet; `components/ui/` holds only `button`.

## Conventions for new code

- **Routes** go in `app/` using App Router file conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`). Use route groups `(name)` to organize without affecting URLs.
- **Shared UI** goes in `components/` at the repo root; **non-UI logic** (API clients, recommendation logic, types) in `lib/`. Import both via `@/components/...` and `@/lib/...`.
- **Server vs client:** keep pages and data-fetching components as Server Components. Push `"use client"` down to the smallest interactive leaf (e.g. a rating widget, search box).
- **Data fetching:** fetch in Server Components or Route Handlers, never expose API keys to the client. Secrets go in `.env.local` (all `.env*` files are gitignored); only `NEXT_PUBLIC_*` vars reach the browser.
- **Caching:** with Cache Components enabled, wrap cacheable fetches (e.g. movie metadata) in `"use cache"` functions with `cacheLife`/`cacheTag`; leave per-user data (personal recommendations) dynamic and stream it behind `<Suspense>`. Details in [nextjs-16.md](nextjs-16.md).
- **Mutations:** prefer Server Actions for form submissions such as rating a movie.

## Decided

- **Auth:** Supabase Auth only → [auth.md](auth.md)
- **Persistence:** Supabase Postgres through Drizzle ORM (no Supabase Data API) → [database.md](database.md)

## Open decisions

Record the choice here (and add a spoke if it's substantial) once made:

- Movie data source (e.g. TMDB, OMDb, local dataset)
- Recommendation approach (content-based, collaborative filtering, LLM-assisted)
- Test framework
