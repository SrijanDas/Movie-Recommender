# Architecture

← Back to [CLAUDE.md](../CLAUDE.md)

## Current layout

```
app/
  layout.tsx          # root layout: header, footer (TMDB attribution), toaster
  page.tsx            # "/" — favourites picker (starter grid + search, min 3)
  recommendations/    # "/recommendations" — poster grid with reasons + feedback
  my-movies/          # "/my-movies" — edit the list, add liked films
  sign-in/            # "/sign-in" — email magic link
  auth/confirm/       # route handler: finishes sign-in, merges the anonymous list
  auth/actions.ts     # signInWithEmail, signOut
  actions.ts          # movie Server Actions (search, favourites, like, feedback, remove)
components/
  ui/                 # shadcn components (restyled to DESIGN.md)
  movies/             # poster, search, favourites picker, recommendation card, list controls
  site/               # header, nav, sign-in form
lib/
  auth.ts             # getCurrentUserId() — verified Supabase user id
  supabase/           # auth-only clients: server.ts, client.ts, proxy.ts (session refresh)
  db/                 # Drizzle: schema.ts (tables), index.ts (db client)
  tmdb/               # TMDB client, types, image helpers
  recommend/          # recommendation engine (pure functions + candidate gathering)
  movies/store.ts     # user list: Postgres when signed in, cookie when not
drizzle/              # generated SQL migrations
proxy.ts              # Next 16 proxy — refreshes the Supabase session
next.config.ts        # framework config — see nextjs-16.md
```

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
- **Movie data:** TMDB API → [recommendations.md](recommendations.md)
- **Recommendation approach:** weighted content-based scoring with explained reasons → [recommendations.md](recommendations.md)
- **Anonymous use:** lists live in a cookie until sign-in, then merge into Postgres → [recommendations.md](recommendations.md)

## Open decisions

Record the choice here (and add a spoke if it's substantial) once made:

- Test framework
