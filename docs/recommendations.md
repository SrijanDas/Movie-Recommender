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
- **Starter grid:** `getStarterMovies()` returns TMDB's 40 most-voted films (`discover`, `sort_by=vote_count.desc`), i.e. the films most people have seen. The home page fetches it only after reading cookies, so the build never calls TMDB.
- **Images:** posters load straight from TMDB's CDN with `unoptimized` (they're pre-sized), falling back to the title if an image fails.
- **Terms:** the free API is non-commercial and requires the attribution shown in the site footer (`components/site/header.tsx`). Don't remove it.

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
| `favorite` | +2 (picked on the home screen; 3–10 required, see `MIN_FAVORITES`/`MAX_FAVORITES`) |
| `liked`, `up` | +1 |
| `down` | −1 (counts against that film's director, cast, themes) |
| `seen` | 0: never recommended, no effect on taste |

### Pipeline (`index.ts`)

1. Fetch details for every rated movie and build the profile: for each dimension, a map of feature → summed signal weight, plus the titles that contributed it.
2. **Candidates:** TMDB recommendations + similar lists for the 10 strongest liked films, plus `discover` queries for the top directors, the top leads, and the top genre with the top keywords. Ids found by more sources rank first; anything the user has already rated is excluded; the list is capped at 100.
3. **Score** each candidate: `Σ weight_dim × clamp(Σ profile weight of its features ÷ strongest weight in that dimension, −1, 1)`, plus `0.05 × vote_average/10`, discounted when there are fewer than 500 votes.
4. **Reasons:** the two strongest positive matches ("Directed by …", "Stars …"), never the bare "Live action" format. Each reason carries the liked titles that share the feature.

Recommendations are computed per request (dynamic, streamed behind `<Suspense>`). TMDB details are cached, so repeat visits are fast; a cold first visit makes about 100 TMDB calls and takes around 6 seconds.

`/recommendations` requires at least `MIN_FAVORITES` (3) positive films (favourite, liked or 👍) and otherwise sends the user back to pick more.

### Tuning

Change `DIMENSION_WEIGHTS` in `score.ts` or `signalWeight` in `profile.ts`. Keep the dimension weights summing to 1, and update PRODUCT.md if the order of importance changes.

## User lists: `lib/movies/store.ts`

One API whether or not the user is signed in:

- **Signed in:** the `user_movies` table (one row per user and film; `signal`, and a title/poster/year snapshot for display). See [database.md](database.md).
- **Anonymous:** an httpOnly cookie `mr_list` holding `[[tmdbId, signal], …]`, capped at 100 entries.
- `mergeCookieIntoAccount()` runs from `/auth/confirm` after sign-in. It adds cookie films the account doesn't have; rows already in the account win.

Mutations are Server Actions in `app/actions.ts` (`setFavorites`, `addLikedMovie`, `rateRecommendation`, `removeMovie`, `searchMoviesAction`). Each validates its input and re-checks the id against TMDB before writing.
