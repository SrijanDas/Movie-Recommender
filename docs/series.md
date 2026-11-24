# Series, people and the Home page

Read this when touching series pages, person pages, the mixed search, or the home page's shelves.

## Routes

`app/(title)/` holds the public detail pages, sharing one layout (`app/(title)/layout.tsx`: app shell for
members, plain header for visitors). All three prefixes are public in `proxy.ts`.

- `/movie/[id]`: a film.
- `/series/[id]`: a series (`getSeries`, `/tv/{id}` with credits and external ids). Year range from
  first/last air dates ("2019–" while running), number of seasons, creators instead of directors.
  Under where-to-watch, a Seasons section (`components/movies/seasons.tsx`): season chips (Specials last),
  then each episode's still, number, name, rating, air date, runtime and overview (tap to expand). The first
  season renders with the page (`getSeasonEpisodes`, `/tv/{id}/season/{n}`); others load on tap through
  `getSeasonAction` in `app/series/actions.ts`.
- `/person/[id]`: a cast or crew member (`getPerson`, `/person/{id}` with `combined_credits`): portrait,
  department, birth/death, biography (first paragraph, rest behind "Read more"), and up to 60 films and
  series, best known (most votes) first, with their role. Talk/news shows, "as Self" appearances and
  posterless credits are dropped.

Film and series pages render through `TitleDetails` in `components/movies/title-page.tsx`; each page only
maps its TMDB shape onto `TitleData`. Cast cards and directors/creators link to `/person/[id]`.
`getMovieMedia` and `getWatchProviders` take a `TitleKind` (`"movie" | "tv"`); the Stremio chip uses the
series link for series.

## Saving and rating series

`user_series` (migration 0016) holds a member's series: `signal` is `watchlist` or a Seen it answer, plus a
display snapshot. It's a separate table from `user_movies` because TMDB numbers films and series
separately, and so everything reading `user_movies` (engine, My films, profiles, lists, memories, check-in)
stays films-only. Actions: `setSeriesSignal` / `forgetSeries` in `app/series/actions.ts` (the snapshot is
fetched server-side); store in `lib/series/store.ts`.

- **Series page:** `SeriesVerdict`: Seen it in view, Add/Remove watchlist in the ⋯ menu (hidden once
  answered). No favourite, send or "Not interested" for series.
- **Watchlist:** `getWatchlistSeries` returns them as `ListedMovie` with `kind: "series"`; the page puts
  started films first, then films and series together, newest first. `WatchlistGrid` keys cards by
  kind + id and sends a series' Seen it / Remove / Undo to the series actions. The genre Filter maps
  series genres onto film ones ("Sci-Fi & Fantasy" → Science Fiction, Fantasy; "Action & Adventure";
  "War & Politics").
- A series' Seen it answer shows only on its page: not on My films, profiles, or in recommendations.
  Where-to-watch doesn't track watching (`tracked={false}`), so no check-in or memories.

## Search

`/search` uses `searchTitlesAction` (`/search/multi`, people removed): films and series together in TMDB's
order, as `TitleTile`s (`components/movies/title-tile.tsx`). The pre-typing
grid samples from the most-voted films and series. Pickers (onboarding, lists, send) keep the films-only
`searchMoviesAction`. `SearchResult.kind` is `"series"` for series; absent or `"movie"` means a film.

## Home

`/home` is where members land (`homeFor`, the logo, the PWA start URL, signed-in redirects in `proxy.ts`).
It shows three sideways shelves (`components/movies/home-shelves.tsx`):
New films (`/movie/now_playing`), Popular films and Popular series
(`/movie/popular`, `/tv/popular`), cached for hours via `getHomeShelves`. Recommendations have their own tab,
"For you" (`/recommendations`). Onboarding ends on Home too.

**Sideloading For you:** Home's `WarmRecommendations` reads the member's films during render, then calls
`getFirstRecommendations` inside `after()`, once the page has been sent. That function is
`getRecommendations` behind `"use cache"` (`cacheLife("minutes")`), keyed by the exact film list, and the For
you page calls the same function, so it opens on the cached batch. Any new answer changes the list and
therefore the key. Refresh and "load more" still compute fresh (`loadMoreRecommendations`).
