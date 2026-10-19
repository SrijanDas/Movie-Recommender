# Architecture

← Back to [CLAUDE.md](../CLAUDE.md)

## Current layout

```
app/
  layout.tsx          # root layout: fonts, viewport/PWA meta, toaster, service worker
  manifest.ts         # PWA manifest (start_url /recommendations); icons in public/icons, app/icon.svg, app/apple-icon.png
  page.tsx            # "/" — public landing page (poster wall, how it works)
  sign-in/            # "/sign-in" — email + password, or an email link (public)
  sign-up/            # "/sign-up" — name → email → password, one field per screen (public)
  credits/            # "/credits" — the only place third-party services are named/credited (public)
  offline/            # "/offline" — served by public/sw.js when the network is down (public)
  onboarding/         # "/onboarding" — favourites picker; shown once, until profiles.onboarded_at is set
  (app)/layout.tsx    # app shell: top bar, bottom tab bar (phones), onboarding gate
  (app)/recommendations/  # poster grid with reasons, feedback, film search
  (app)/watchlist/    # films saved for later
  (app)/my-movies/    # favourites + seen films, add more; favourites/ edits favourites (drag, Move menu, remove), saved on Done
  (app)/account/      # Profile: picture, name, @handle, share link; email, install, Credits link, sign out
  (app)/account/edit/ # edit picture (upload / poster / icon), name, username (checked free), bio
  movie/[id]/         # film page: backdrop banner, details, "Seen it" answer + watchlist toggle; public (own layout: app shell for members, join bar for visitors)
  u/[handle]/         # public profile, served at /@handle via a rewrite; open to signed-out visitors; share image
  profile/actions.ts  # checkHandle, suggestHandleFor, saveProfile (see docs/profiles.md)
  auth/confirm/       # route handler: finishes email-link sign-in
  auth/actions.ts     # signInWithEmail, signInWithPassword, signOut
  actions.ts          # movie Server Actions (search, favourites, like, feedback, watchlist, remove)
components/
  ui/                 # shadcn components (restyled to DESIGN.md)
  movies/             # poster, search, favourites picker, recommendation card, watchlist grid, list controls
  site/               # logo, headers, tab bar, sign-in form, PWA (service worker + install prompt)
public/sw.js          # service worker: network-only, /offline fallback for navigations
lib/
  auth.ts             # getCurrentUser(), getCurrentUserId(), requireUserId(), safeNext()
  onboarding.ts       # isOnboarded(), markOnboarded(), homeFor()
  supabase/           # auth-only clients: server.ts, client.ts, proxy.ts (session refresh)
  db/                 # Drizzle: schema.ts (tables), index.ts (db client)
  tmdb/               # TMDB client, types, image helpers
  recommend/          # recommendation engine (pure functions + candidate gathering)
  movies/store.ts     # the user's movie list in Postgres
drizzle/              # generated SQL migrations
proxy.ts              # Next 16 proxy — refreshes the session; signed-out users only reach /, /sign-in, /sign-up, /offline, /auth/*
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
- **No anonymous use:** every app screen needs an account (`proxy.ts`), and a finished onboarding (`app/(app)/layout.tsx` → `/onboarding`).
- **PWA:** manifest + icons + a minimal service worker (offline page only; pages are never cached). The Account page (header avatar) offers install via `beforeinstallprompt`, with iOS instructions.

## Open decisions

Record the choice here (and add a spoke if it's substantial) once made:

- Test framework
