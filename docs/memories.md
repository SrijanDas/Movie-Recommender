# Memories (watch dates, "on this day", recaps)

← Back to [CLAUDE.md](../CLAUDE.md)

Memories remind users of films they watched: **"on this day"** a film was watched in an earlier year, a **month recap** of the films watched in the month just ended, and a **year recap** for the year just ended. The data side is built: watch dates, the daily job that works out what's due, and a queue. **Delivery is not built yet**: no push, email or in-app screen reads the queue so far.

## Watch dates

`user_movies.watched_at` (with `watched_via`, the watch option tapped, if any) records when a film was watched. `putMovies` (`lib/movies/store.ts`) works it out in SQL from the row it overwrites. Callers never pass it.

| The rewrite | `watched_at` |
| --- | --- |
| A watchlist film gets a "Seen it" answer or becomes a favourite | its `started_at` if it was started from the film page, else now |
| The film leaves My films ("Not interested", "Might watch someday") | cleared |
| Anything else (a changed answer, favouriting a seen film, re-ranking) | kept |
| A fresh insert (onboarding favourites, "add films I've seen", a "Seen it" answer on a film not saved yet) | null |

Films logged as seen without going through the watchlist have no date, because when they were really watched is unknown. Dating them "now" would produce false "a year ago you watched…" memories. Rows from before migration 0015 have no date either.

## Files

| Path | Purpose |
| --- | --- |
| `lib/memories/types.ts` | `MEMORY_KINDS`, `MemoryFilm`, `Memory`. Pure, imported by the schema (relative imports only). |
| `lib/memories/pick.ts` | Pure date logic: `isOnThisDay`, `onThisDay`, `recapsDue`, `recap`, and `memoryMessage` (default title/body copy). |
| `lib/memories/queue.ts` | Server-only: `queueMemories(today)`, plus `getUnsentMemories` / `markMemoriesSent` for a delivery channel and `getMemories` / `markMemoryRead` for an in-app view. |
| `app/api/cron/memories/route.ts` | The daily job. `GET` with `Authorization: Bearer $CRON_SECRET`. Public in `proxy.ts` (it checks the secret itself). |

## The `memories` table

One row per `(user_id, kind, period)`, so running the job twice in a day never queues a memory twice. `period` is `"2026-11-08"` (on this day), `"2026-10"` (month) or `"2025"` (year). `films` is a jsonb snapshot of the films at the time it was queued, oldest watched first for recaps and most recent year first for "on this day". `sent_at` is stamped by the delivery channel and `read_at` by the app.

## Rules

- **Days are UTC.** The job should run shortly after 00:00 UTC. Recaps are queued on the 1st for the month just ended, and on 1 January the year recap is queued as well. A 29 February film comes back on 28 February in other years. Per-user time zones would need a `profiles.time_zone` and an hourly job.
- **Empty means nothing.** A user who watched nothing in a period gets no recap.
- **Copy never names a service.** `watched_via` can be "Netflix" and the like, so keep it out of messages (CLAUDE.md rule 11).

## Adding delivery

1. Schedule the job: a Vercel Cron entry in `vercel.json` (`{"crons":[{"path":"/api/cron/memories","schedule":"5 0 * * *"}]}`) or any scheduler that sends the bearer token. Set `CRON_SECRET`.
2. After queueing (in the same job or its own), read `getUnsentMemories()`, send each one with `memoryMessage()` for the text, then `markMemoriesSent(ids)`.
3. Respect a per-user opt-out once notification settings exist.
