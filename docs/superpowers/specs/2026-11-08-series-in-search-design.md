# Series in search and the Watchlist: design

Date: 2026-11-08 · Status: draft for review

## Why

The user searched "Lanterns" for the new series. Search only looks at films, so all it found was a film
entry with the same name and no poster: an empty card. Search should find whatever someone types,
whether it's a film, a series, a documentary or a documentary series, without them having to say which.

Separately, search should work without an account, so a visitor can look something up before signing up.

## Goals

1. **One search, no type filter.** Search returns films and series together, in the order the movie
   database ranks them for the query. There is no Films/Series toggle and no rule that drops a kind of
   title (documentaries, mini-series, specials, TV movies, posterless entries all stay). The only results
   dropped are *people* (actors, directors): finding people is the People tab's job, and that means app
   members.
2. **Series are labelled, not separated.** A series tile looks like a film tile plus a small "Series"
   label, so the two can't be confused. Its year is the first-air year.
3. **A series page** at `/series/[id]`, public like `/movie/[id]`: banner, poster, title, first-air year
   (with end year, or "–" if still running), number of seasons, rating, overview, creators ("Created by"
   in place of "Directed by"), cast, trailer/clips and stills, and where to watch (same chips as films,
   free options first, including the Stremio button using its series link). Members get the bookmark
   and Seen it; visitors see the page without actions, as on film pages.
4. **Series on the Watchlist.** Saving a series puts it on the Watchlist, mixed in with films, newest
   first, with the "Series" label. Seen it and Remove work on it as on films, with Undo. The genre Filter
   includes series' genres.
5. **Search is public.** `/search` opens without an account. Members see it in the app shell as now;
   visitors get the plain header with Sign in (as on film pages). The Films | People toggle is hidden
   for visitors; `/search/people` still requires an account. **Visitors reach it from a search icon in
   the public header** (`PlainHeader` / `SignedOutNav` in `components/site/header.tsx`), so it shows on
   every public page: landing, film and series pages, profiles, shared lists, credits. Decided by the
   user; the icon's look and placement go through `/impeccable`.

## Non-goals (for now)

A series is saved and can be marked seen, but otherwise stays out of the rest of the app:

- **Not on My films or public profiles.** A Seen it answer on a series is stored and shown only on the
  series page (the Seen it menu shows the current answer, like on a film page).
- **Not in recommendations.** The engine never sees series, saved or seen; the feed stays films only.
- **Not in shared lists.** A list made from (or synced to) the Watchlist skips series. *Builder's call
  how to say this, if at all; a quiet skip is acceptable.*
- **Not sendable** (no "Send to a friend" on a series page), not favouritable (no star), no "Not
  interested" / "Might watch someday" menu.
- **No "Did you finish it?" check-in** and no "Watching" state: tapping a where-to-watch option on a
  series opens the service but doesn't start tracking. Series take weeks; the check-in is built for one
  sitting.
- **No memories** (watch dates, on-this-day, recaps) for series.
- **Onboarding** stays films only.

## Anti-goals

- Search filtering anything out by type. That's the bug that hid documentaries in the user's mind and
  the reason for this work.
- A saved series ever turning into, or overwriting, a film with the same number. TMDB numbers films and
  series separately, so film 1234 and series 1234 are different titles.
- Naming the movie database or any other service in the UI (CLAUDE.md rule 11).

## Decided (by the user)

- Scope: series in search and the Watchlist only; recommendations stay films only.
- Search doesn't filter by type at all.
- People search is for app members only and needs an account.
- Seen series stay off My films and profiles for now.

## My calls (Claude's, open to change)

- **Storage: a separate `user_series` table**, not a type column on `user_movies`. About 20 places read
  `user_movies` (engine, My films, profiles, lists, tips, memories, check-in) and several writes key on
  the number alone; a separate table keeps all of them films-only with no risk of a series/film number
  clash. Columns mirror what's needed: user, series id, signal (`watchlist` or one of the Seen it
  answers), display snapshot (name, poster, first-air year), timestamps. Primary key (user, series id).
  If series later join My films, revisit.
- **URL `/series/[id]`**, not `/tv/[id]`: reads as what it is.
- **Search uses the database's multi-search** (films + series + people in one ranked list), with people
  removed. Keep the current result count (12) unless that leaves too few after removing people; the
  builder may fetch a second page to fill.
- **The "Popular and acclaimed" grid before typing mixes in series**: sample from the most-voted films
  and the most-voted series together, so the empty state matches "search covers everything".
- **Empty result text** changes from "No films match…" to "Nothing matches…".
- **Visitor actions:** visitors see no bookmark or Seen it on the series page, matching film pages
  today. (Film pages don't prompt sign-in from these buttons; they simply aren't shown.)
- **Search page metadata/heading** stays "Search"; the members' toggle's first tab is renamed from
  "Films" to something that covers both (e.g. "Titles" or "Films & series"; builder's call, via
  `/impeccable`).

- **Watchlist genre Filter maps series genres onto film genres**, so one "Science Fiction" choice
  finds both kinds: "Action & Adventure" counts as Action and Adventure, "Sci-Fi & Fantasy" as Science
  Fiction and Fantasy, "War & Politics" as War. Series-only genres ("Reality", "Talk", "Soap", "News",
  "Kids") stay as their own entries. The series page's badges show the series' own genre names.
- **Other pickers stay films-only:** onboarding, "Add a favourite", the list editor's picker and the
  send-a-film picker keep the existing film search. Only `/search` uses the new mixed search.

## Constraints

- Follow CLAUDE.md: Drizzle for data (new migration via `bun run db:generate`), Cache Components
  (`"use cache"` on the new TMDB calls with sensible `cacheLife`), shadcn components, DESIGN.md tokens,
  mobile-first, `/impeccable` for the series page and the label, `bun run lint` and `bun run build`
  before done. No test files.
- `proxy.ts`: add `/search` (exact) and `/series/` (prefix) to the public set; `/search/people` must stay
  private. `/search` must move out of the `(app)` group (whose layout requires sign-in and onboarding)
  into a layout like `app/movie/layout.tsx`; members who haven't onboarded still go to onboarding.
- Reuse the film page's parts (banner slideshow, stills gallery, video player, cast row, where-to-watch,
  Seen it menu) rather than copying them; generalise them where they assume a film.
- Server actions that save a series take a series id and touch only `user_series`.

## Left to the builder

- Exact TMDB endpoints and fields (`/search/multi`, `/tv/{id}` with credits/keywords/external ids,
  `/tv/{id}/images|videos|watch/providers`, `/discover/tv` or `/tv/top_rated` for the popular pool) and
  how to type them.
- How the Watchlist page merges the two sources and how the shared card/filter components learn the
  difference (a `kind` field on the listed item is the obvious route).
- How many cast, creators and seasons details to show, within the film page's layout.
- Docs: update PRODUCT.md (search, watchlist, series page), CLAUDE.md status line, the search paragraph
  in docs/recommendations.md, the public routes in docs/auth.md, the new table in docs/database.md, and
  add a short `docs/series.md` spoke with a row in CLAUDE.md's table.
