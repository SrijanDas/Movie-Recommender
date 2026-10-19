# Database (Drizzle + Supabase Postgres)

← Back to [CLAUDE.md](../CLAUDE.md)

The database is Supabase's Postgres, accessed **only** through Drizzle ORM (`drizzle-orm` 0.45 + `postgres` driver). Supabase handles auth only ([auth.md](auth.md)).

## Files

| Path | Purpose |
| --- | --- |
| `lib/db/schema.ts` | All table definitions — the source of truth for the schema. |
| `lib/db/index.ts` | `db` client (server-only). Import as `import { db } from "@/lib/db"`. |
| `drizzle.config.ts` | drizzle-kit config. Manages the `public` schema only. |
| `drizzle/` | Generated SQL migrations. Commit them; don't hand-edit. |

**Tables:** `user_movies` (every film a user has an opinion on, incl. the watchlist) and `profiles` (one row per user: created at sign-up to reserve the `handle`, with `onboarded_at` null until onboarding finishes; also `display_name`, `bio`, `avatar` — see [profiles.md](profiles.md); `0005_backfill_profiles.sql` is a custom migration from `drizzle-kit generate --custom` that marks pre-existing users with favourites as onboarded). `user_movies.seen_signal` (0007) holds a favourite's "Seen it" answer; favourites saved before it are backfilled by the temporary `scripts/backfill-favorite-seen.ts`).

## Workflow

```bash
# edit lib/db/schema.ts, then:
bun run db:generate   # write a SQL migration into drizzle/
bun run db:migrate    # apply pending migrations to DATABASE_URL
bun run db:studio     # browse data
```

Don't create tables in the Supabase dashboard or with `supabase migration` — schema changes go through Drizzle so migrations stay in one place.

## Conventions

- **Linking to users:** `uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" })`, with `authUsers` from `drizzle-orm/supabase`. Don't redefine Supabase's `auth` schema.
- **RLS on every table:** add `.enableRLS()` with no policies. Tables in `public` are otherwise reachable through Supabase's Data API using the public publishable key. Drizzle connects as `postgres`, which bypasses RLS, so the app is unaffected. Better still, disable the Data API in the Supabase dashboard (Integrations → Data API), since we don't use it.
- **Authorization lives in app code:** filter user-owned rows by `getCurrentUserId()` (`lib/auth.ts`).
- **Server only:** `lib/db` imports `server-only`. Query from Server Components, Server Actions, or Route Handlers.
- **Caching:** queries are dynamic. Wrap shared, non-user data in `"use cache"`; keep per-user queries uncached behind `<Suspense>` ([nextjs-16.md](nextjs-16.md)).

## Connection

`DATABASE_URL` is Supabase's **transaction pooler** string (Dashboard → Connect → Transaction pooler, port `6543`). The client sets `prepare: false` because that pooler doesn't support prepared statements. If drizzle-kit has trouble migrating through it, run migrations against the session pooler (port `5432`) instead.

drizzle-kit loads `.env.local` through `@next/env`, the same way Next does.

## CI

[.github/workflows/migrate.yml](../.github/workflows/migrate.yml) runs `bun run db:migrate` on every push to `main` that touches `drizzle/`, `lib/db/schema.ts`, or `drizzle.config.ts` (and on manual dispatch). It reads the `DATABASE_URL` repo secret. Use the session pooler string (port `5432`) there. Commit generated migrations with the schema change, because CI only applies them and never generates them.
