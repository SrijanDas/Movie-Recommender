# Recommendations & movie data

← Back to [CLAUDE.md](../CLAUDE.md)

How a user's films become recommendations. The product rules behind this are in [PRODUCT.md](../PRODUCT.md).

## Movie data: TMDB

| Path | Purpose |
| --- | --- |
| `lib/tmdb/client.ts` | Server-only TMDB client. Each helper is a `"use cache"` function. |
| `lib/tmdb/types.ts` | The subset of TMDB response shapes we use. |
| `lib/tmdb/images.ts` | `posterUrl()`, `releaseYear()`. Safe for client components. |

- **Host:** `api.tmdb.org`, TMDB's alternate API hostname. Some ISPs reset TLS connections to `api.themoviedb.org` by hostname; don't switch back without testing on the developer's network.
- **Reliability:** `tmdbFetch` allows at most 8 requests in flight per process and retries network errors, 429s and 5xx three times with backoff.
- **Env:** `TMDB_API_TOKEN` in `.env.local`, set to the API Read Access Token (v4 bearer) from themoviedb.org → Settings → API. Never prefix it with `NEXT_PUBLIC_`. Without it, `/recommendations` shows a setup notice and search returns nothing.
- **Caching:** `getMovie`/`getRelated`/`getStarterMovies` use `cacheLife("weeks")`; `searchMovies`/`discover` use `cacheLife("days")`. `getMovie` returns `null` for unknown ids.
- **Starter grid:** `getStarterMovies()` returns TMDB's 40 most-voted films (`discover`, `sort_by=vote_count.desc`), i.e. the films most people have seen. Onboarding and the landing page's poster wall use it, both at request time (after cookies / `connection()`), so the build never calls TMDB.
- **Images:** posters load straight from TMDB's CDN with `unoptimized` (they're pre-sized), falling back to the title if an image fails.
- **Terms:** the free API is non-commercial and requires visible attribution (`TmdbAttribution` in `components/site/header.tsx`, shown on the landing page, sign-in and Account). Don't remove it.

## Engine: `lib/recommend/`

Weighted content-based scoring. It is deterministic and every result explains itself.

| File | Does |
| --- | --- |
| `types.ts` | `SIGNALS`, `DIMENSIONS`, `RatedMovie`, `Recommendation`. Pure; imported by the DB schema too. |
| `features.ts` | TMDB movie → features per dimension. |
| `profile.ts` | Signal weights; builds the taste profile from rated movies. |
| `candidates.ts` | Gathers candidate ids from TMDB (server-only). |
| `score.ts` | Scores a candidate against the profile and picks its reasons. |
| `index.ts` | `getRecommendations(rated)`: ties it together and returns the top 20. |

### Features (`features.ts`)

| Dimension | Source | Weight (`score.ts`) |
| --- | --- | --- |
| director | crew with `job === "Director"` | 0.25 |
| lead | cast billed 1st–2nd | 0.20 |
| genre | `genres` | 0.20 |
| tone | `keywords` (first 20) | 0.15 |
| supporting | cast billed 3rd–8th | 0.10 |
| format | documentary (genre 99) / animated (16) / live action, plus "short" under 40 min | 0.10 |

### Signals (`profile.ts` → `signalWeight`)

| Signal | Weight |
| --- | --- |
| `favorite` | +2.5 for the favourite ranked first, falling linearly to +1.5 for the last (`FAVORITE_TOP`/`FAVORITE_BOTTOM`, `weighMovies`); the list averages +2. Order comes from `user_movies.rank` (0 = top); unranked favourites sort last by `created_at`. At least 3 (`MIN_FAVORITES`); onboarding caps its picks at 10 (`MAX_ONBOARDING_FAVORITES`), My films has no cap |
| `peak` | +1.5 ("Peak") |
| `liked` | +1 (added on My films, or "Good movie"; was "Loved it") |
| `up` | +0.5 ("Kinda liked it") |
| `no_rewatch` | −0.5 ("Would not rewatch": watched it, mildly against) |
| `down` | −1: "Not interested" on a recommendation card (formerly "Not for me"). Counts against that film's director, cast, themes |
| `quit` | −1.5 ("Left midway": the strongest dislike) |
| `seen` | 0: legacy, from before "Seen it" asked how it was. Never recommended, no effect on taste |
| `someday` | 0: "Might watch someday" from a card's ⋯ menu. Never recommended, no effect on taste, not listed anywhere |
| `watchlist` | 0: saved for later from a card's bookmark icon or the film page. Never recommended, no effect on taste. Answering "Seen it" overwrites it, which moves the film off the watchlist |

Favourites come from the onboarding picker (saved in the order picked; `setFavorites` also marks onboarding done), from "Add a favourite" on My films, or by tapping ★ on a "Seen it" row (moves the film into favourites, at the bottom). On My films the Favourites tab is ranked: drag to reorder, saved through `reorderFavorites`. Favourites rank as seeds too, so the top ones' related lists are always pulled.

The recommendation card's poster and title open `/movie/[id]` (TMDB details, cast, trailer via `getTrailerUrl`, "Where to watch" via `getWatchProviders` (JustWatch data; country from the host's geo header or the browser language, see `lib/region.ts`; credit JustWatch wherever it's shown), and the same "Seen it" menu, which shows and changes your answer). A ⋯ button over the poster's top-right corner opens "Not interested" (saves `down`) and "Might watch someday" (saves `someday`), both with Undo. The action row is "Seen it" followed by a bookmark icon (`addToWatchlist`, with Undo). "Seen it" opens a dropdown asking how it was, worst to best: "Left midway / Would not rewatch / Kinda liked it / Good movie / Peak", and writes `quit`, `no_rewatch`, `up`, `liked` or `peak` via `rateRecommendation`. The answers live in `components/movies/feedback.ts`; My films filters its "Seen it" list by the same answers.

### Pipeline (`index.ts`)

1. Fetch details for every rated movie and build the profile: for each dimension, a map of feature → summed signal weight, plus the titles that contributed it.
2. **Candidates:** TMDB recommendations + similar lists for the 10 strongest liked films, plus `discover` queries for the top directors, the top leads, and the top genre with the top keywords. Ids found by more sources rank first; anything the user has already rated is excluded; the list is capped at 100.
   **Feature films only:** TMDB files TV movies, single episodes, specials and shorts under `/movie` too. TV movies (genre 10770) are dropped from the candidate lists and from `discover` (`without_genres`), and after fetching details `isFeatureFilm` (`features.ts`) also drops anything under 60 minutes (`MIN_FEATURE_RUNTIME`), which catches episodes like "Doctor Who: Last Christmas" and films with an unknown (0) runtime.
3. **Score** each candidate: `Σ weight_dim × clamp(Σ profile weight of its features ÷ strongest weight in that dimension, −1, 1)`, plus `0.05 × vote_average/10`, discounted when there are fewer than 500 votes.
4. **Reasons:** the two strongest positive matches ("Directed by …", "Stars …"), never the bare "Live action" format. Each reason carries the liked titles that share the feature.

Recommendations are computed per request (dynamic, streamed behind `<Suspense>`). Acting on a card (an answer or "Not interested") removes only that card, with Undo: `rateRecommendation`/`undoRating` deliberately don't revalidate. The list is recomputed only when the user taps **Refresh** (`components/movies/recommendation-list.tsx`: `router.refresh()`). TMDB details are cached, so repeat visits are fast; a cold first visit makes about 100 TMDB calls and takes around 6 seconds.

`/recommendations` requires at least `MIN_FAVORITES` (3) positive films (favourite, liked or kinda liked) and otherwise links to My films to add more. Its search bar (`components/movies/film-search.tsx`) opens any film's page.

### Tuning

Change `DIMENSION_WEIGHTS` in `score.ts` or `signalWeight` in `profile.ts`. Keep the dimension weights summing to 1, and update PRODUCT.md if the order of importance changes.

## User lists: `lib/movies/store.ts`

The `user_movies` table: one row per user and film, with its `signal` and a title/poster/year snapshot for display. See [database.md](database.md). There is no anonymous list; every user is signed in.

Mutations are Server Actions in `app/actions.ts` (`setFavorites`, `reorderFavorites`, `addFavoriteMovies`, `addLikedMovies`, `rateRecommendation`, `addToWatchlist`, `undoRating`, `removeMovie`, `searchMoviesAction`), wrapped for client components by `components/movies/movie-actions.ts`. Each validates its input and re-checks the id against TMDB before writing.
