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
- **Terms:** the free API is non-commercial and requires visible attribution. It lives on `/credits` (`app/credits/page.tsx`, public, linked from Account and the footer on public pages) together with the JustWatch credit, and nowhere else (CLAUDE.md rule 11).

## Engine: `lib/recommend/`

Content-based, item-item scoring with TMDB's recommendation lists as a collaborative signal, then a re-ranking pass for variety. Deterministic, no LLM, and every result explains itself. Design and the research behind it: [superpowers/specs/2026-10-22-recommendation-engine-v2-design.md](superpowers/specs/2026-10-22-recommendation-engine-v2-design.md).

| File | Does |
| --- | --- |
| `types.ts` | `SIGNALS`, `DIMENSIONS`, `RatedMovie`, `Recommendation`. Pure; imported by the DB schema too. |
| `features.ts` | TMDB movie → features per dimension. |
| `profile.ts` | Signal weights; the taste profile (feature → summed weight, plus the liked titles behind it). |
| `similarity.ts` | `DIMENSION_WEIGHTS`, IDF over the films in play, and the film-to-film similarity. |
| `source.ts` | `MovieSource`: the three data calls the engine needs. The app passes the TMDB client. |
| `candidates.ts` | Gathers candidate ids with provenance (which seed's TMDB list carried each one). |
| `score.ts` | Scores a candidate against every rated film; picks its anchors and reasons. |
| `rerank.ts` | Greedy pick of one batch: diversity (MMR) + genre calibration + one film per franchise. |
| `index.ts` | `getRecommendations(rated, skip, source?)`: ties it together and returns the next 20. |

### Features (`features.ts`)

| Dimension | Source | Weight (`similarity.ts`) |
| --- | --- | --- |
| director | crew with `job === "Director"` | 0.25 |
| lead | cast billed 1st–2nd | 0.20 |
| genre | `genres` | 0.20 |
| tone | `keywords` (first 20) | 0.15 |
| supporting | cast billed 3rd–8th | 0.10 |
| format | documentary (genre 99) / animated (16) / live action, plus "short" under 40 min. Live action is left out of similarity: two live-action films have nothing in common for it | 0.10 |

### Signals (`profile.ts` → `signalWeight`)

| Signal | Weight |
| --- | --- |
| `favorite` | +2.5 for the favourite ranked first, falling linearly to +1.5 for the last (`FAVORITE_TOP`/`FAVORITE_BOTTOM`, `weighMovies`); the list averages +2. Order comes from `user_movies.rank` (0 = top); unranked favourites sort last by `created_at`. At least 3 (`MIN_FAVORITES`); at most 10 (`MAX_FAVORITES`), at onboarding and in My films |
| `peak` | +1.5 ("Peak") |
| `liked` | +1 (added on My films, or "Good movie"; was "Loved it") |
| `up` | +0.5 ("Kinda liked it") |
| `no_rewatch` | −0.5 ("Won’t rewatch": watched it, mildly against) |
| `okay` | 0 ("Okay, but won’t rewatch": watched it, neither for nor against). Never recommended, no effect on taste |
| `down` | −1: "Not interested" on a recommendation card (formerly "Not for me"). Counts against films like it |
| `quit` | −1.5 ("Left midway": the strongest dislike) |
| `seen` | 0: legacy, from before "Seen it" asked how it was. Never recommended, no effect on taste |
| `someday` | 0: "Might watch someday" from a card's ⋯ menu. Never recommended, no effect on taste, not listed anywhere |
| `watchlist` | 0: saved for later from a card's bookmark icon or the film page. Never recommended, no effect on taste. Answering "Seen it" overwrites it, which moves the film off the watchlist |

Favourites come from the onboarding picker (saved in the order picked; `setFavorites` also marks onboarding done), from "Add a favourite" on My films, or by tapping ★ on a "Seen it" row (moves the film into favourites, at the bottom). A favourite was seen, so it also lists under "Seen it": it carries its answer in `user_movies.seen_signal` (set to `peak`, `DEFAULT_SEEN_ANSWER`, when it becomes a favourite, replacing any earlier answer), and answering "Seen it" on a favourite changes only that. Taking a film out of the favourites (Edit, or unpicking at onboarding) turns it back into that answer, so it stays under "Seen it"; removing it from "Seen it" deletes it, favourite and all. `seen_signal` has no effect on taste: the favourite weight applies. On My films the Favourites filter (last, after Peak; All is the default) shows them ranked; Edit opens the ranking page: drag to reorder, saved through `reorderFavorites`. Favourites rank as seeds too, so the top ones' related lists are always pulled.

### Pipeline (`index.ts`)

1. Fetch details for every rated movie (weight ≠ 0) and build the profile: for each dimension, a map of feature → summed signal weight, plus the titles that contributed it. The profile only seeds the discover queries and labels the reasons; scoring is item-item (step 4).
2. **Candidates** (`candidates.ts`): TMDB recommendations + similar lists for the 12 strongest liked films (`MAX_SEEDS`), plus `discover` queries for the top directors, the top leads, and the top genre with the top keywords (`discover` asks for at least 1,000 votes: sorted by rating, a lower floor surfaces obscure films with inflated scores). Each id collects votes: a seed's weight ÷ log₂(2 + rank) from its recommendations list, a quarter of that from its similar list, 0.5 per discover hit; the 100 best-voted (`MAX_CANDIDATES`) are fetched. Each candidate remembers which seeds' **recommendations** lists carried it and at what rank (`listedBy`). TMDB's recommendations list is built from TMDB users' behaviour (its staff say it is "not the same system" as similar, which is genre + keyword overlap), so it is the engine's collaborative-filtering signal. Anything the user has already rated is excluded.
   **Feature films only:** TMDB files TV movies, single episodes, specials and shorts under `/movie` too. TV movies (genre 10770) are dropped from the candidate lists and from `discover` (`without_genres`), and after fetching details `isFeatureFilm` (`features.ts`) also drops anything under 60 minutes (`MIN_FEATURE_RUNTIME`), which catches episodes like "Doctor Who: Last Christmas" and films with an unknown (0) runtime.
3. **IDF** (`similarity.ts`): over the rated films plus the candidates, each feature weighs `log((N + 1) / (df + 1)) + 1`, so "Drama" counts for about 1 and a director or a rare keyword for about 5. Every film becomes a vector per dimension, and film-to-film **similarity** is `Σ weight_dim × cosine_dim`, in [0, 1].
4. **Score** (`score.ts`) each candidate against every rated film i: `closeness_i = similarity + 0.6 ÷ log₂(2 + rank)` when film i's TMDB recommendations list carries the candidate (`PROVENANCE_WEIGHT`, `rankWeight`). Then
   `taste = Σ w_i × closeness_i ÷ Σ w_i⁺ + max_i(w_i × closeness_i) ÷ FAVORITE_TOP` (the weighted mean over everything rated, negatives subtracting, plus the single strongest pull, so a film very close to one loved film ranks even for an eclectic taste), and
   `score = taste + 0.3 × bayesianRating ÷ 10 + 0.15 × log-popularity` (`QUALITY_WEIGHT`, `POPULARITY_WEIGHT`; the rating is shrunk toward 6.5 with a 1,000-vote prior, popularity saturates at 10,000 votes).
5. **Anchors and reasons:** `because` holds up to two rated films, strongest pull first, whose closeness is at least 0.3 (`MIN_ANCHOR_CLOSENESS`), so the top favourite's weight alone can't make it the reason for everything; the card shows "Because you like …". The two reason badges are features the candidate shares with liked films, ranked by dimension weight × the feature's share of the strongest in its dimension × IDF, doubled when an anchor has the feature; never the bare "Live action", and format only when nothing more specific matched.
6. **Re-rank** (`rerank.ts`): from the scored pool, pick 20 greedily, each maximising `score − 0.5 × max similarity to a picked film − 0.6 × KL(user genre mix ‖ batch genre mix)` (`DIVERSITY`, `CALIBRATION`; the KL is smoothed with α = 0.01 as in Steck's calibrated recommendations). At most one film per TMDB collection (`belongs_to_collection`) per batch, unless only franchise repeats are left. Output order is the pick order, so scores in a batch aren't monotonic.

The recommendation card's poster and title open `/movie/[id]` (TMDB details; title logo, stills, trailer and clips via `getMovieMedia` (one cached `/images` + `/videos` pair, kept out of `getMovie` so engine calls stay small; videos play in place from a thumbnail via `VideoPlayer`, stills open full-screen in `StillsGallery`); cast as a photo row; the banner loops the main backdrop and up to 7 stills in `BannerSlideshow`, crossfading every 6s, still under reduced motion; "Where to watch" via `getWatchProviders` (JustWatch data; country from the host's geo header or the browser language, see `lib/region.ts`; each chip opens that service's own search for the film via `lib/tmdb/provider-links.ts`, never TMDB's JustWatch page), and the same "Seen it" menu, which shows and changes your answer). A ⋯ button over the poster's top-right corner opens "Not interested" (saves `down`) and "Might watch someday" (saves `someday`), both with Undo. The action row is "Seen it" followed by a bookmark icon (`addToWatchlist`, with Undo). "Seen it" opens a dropdown asking how it was, worst to best: "Left midway / Won’t rewatch / Okay, but won’t rewatch / Kinda liked it / Good movie / Peak", and writes `quit`, `no_rewatch`, `okay`, `up`, `liked` or `peak` via `rateRecommendation`. The answers live in `components/movies/feedback.ts`; My films filters its "Seen it" list by the same answers.

### Pipeline (`index.ts`)

1. Fetch details for every rated movie and build the profile: for each dimension, a map of feature → summed signal weight, plus the titles that contributed it.
2. **Candidates:** TMDB recommendations + similar lists for the 10 strongest liked films, plus `discover` queries for the top directors, the top leads, and the top genre with the top keywords. Ids found by more sources rank first; anything the user has already rated is excluded; the list is capped at 100.
   **Feature films only:** TMDB files TV movies, single episodes, specials and shorts under `/movie` too. TV movies (genre 10770) are dropped from the candidate lists and from `discover` (`without_genres`), and after fetching details `isFeatureFilm` (`features.ts`) also drops anything under 60 minutes (`MIN_FEATURE_RUNTIME`), which catches episodes like "Doctor Who: Last Christmas" and films with an unknown (0) runtime.
3. **Score** each candidate: `Σ weight_dim × clamp(Σ profile weight of its features ÷ strongest weight in that dimension, −1, 1)`, plus `0.05 × vote_average/10`, discounted when there are fewer than 500 votes.
4. **Reasons:** the two strongest positive matches ("Directed by …", "Stars …"), never the bare "Live action" format. Each reason carries the liked titles that share the feature.

The page is an infinite feed (`components/movies/recommendation-list.tsx`). The first batch of 20 is computed per request (dynamic, streamed behind `<Suspense>`). Scrolling near the end calls `moreRecommendations` with every id already loaded; the engine treats those like rated films (`getRecommendations(rated, skip)`), so the next batch continues down the ranking instead of repeating it. Each batch reads the user's list fresh, so answers given while scrolling shape the next one. When skipping leaves fewer than `MAX_CANDIDATES`, `gatherCandidates` pulls the next page of every related and discover list, up to `MAX_PAGES` (5); a batch that comes back empty ends the feed. Acting on a card (an answer or "Not interested") removes only that card, with Undo: `rateRecommendation`/`undoRating` deliberately don't revalidate. There is no Refresh button: reloading the page starts the feed over. With Cache Components the page stays mounted (React Activity), so Back from a film keeps the scrolled feed. TMDB details are cached, so repeat visits are fast; a cold first visit makes about 100 TMDB calls and takes around 6 seconds, and each later batch fetches roughly 20 new films' details.

`/recommendations` requires at least `MIN_FAVORITES` (3) positive films (favourite, liked or kinda liked) and otherwise links to My films to add more. Search lives on its own page, `/search` (`components/movies/search-view.tsx`), which opens any film's page; the query is kept in `?q=` so Back from a film returns to the same results. My films' filters come from `filterMyFilms` in `lib/movies/types.ts`, which shared lists use too. Search shows every film, including ones already on My films. Before you type, its "Popular and acclaimed" grid shows 30 films picked at random on each visit from the 100 most-voted (`getPopularPool`, cached for weeks).

### Tuning

Constants sit at the top of each module: `DIMENSION_WEIGHTS` in `similarity.ts` (keep them summing to 1, and update PRODUCT.md if the order of importance changes), `signalWeight` in `profile.ts`, the provenance/quality/popularity weights and anchor threshold in `score.ts`, `DIVERSITY` and `CALIBRATION` in `rerank.ts`.

**Running the engine outside Next:** `getRecommendations` takes a `MovieSource`, so a bun script can pass plain-`fetch` TMDB calls and print a batch for a hand-written taste. Run it with `bun --conditions=react-server script.ts` (so `server-only` resolves to its empty build) and import the engine by absolute path; never call the real `lib/tmdb/client.ts` from a script, because `cacheLife` throws outside Next. Three sample tastes (a Nolan/drama fan, animation + horror, three gangster films) were used to set the weights above.

**Not done yet, in order of expected value:** time decay (recent answers outweigh old ones; ratings carry no timestamp into the engine), logging impressions and answers so the weights can be learned instead of hand-tuned, plot-overview embeddings as one more similarity dimension for films with sparse keywords.

## User lists: `lib/movies/store.ts`

The `user_movies` table: one row per user and film, with its `signal` and a title/poster/year snapshot for display. See [database.md](database.md). There is no anonymous list; every user is signed in.

Mutations are Server Actions in `app/actions.ts` (`setFavorites`, `reorderFavorites`, `addFavoriteMovies`, `addLikedMovies`, `rateRecommendation`, `addToWatchlist`, `undoRating`, `removeMovie`, `searchMoviesAction`), wrapped for client components by `components/movies/movie-actions.ts`. Each validates its input and re-checks the id against TMDB before writing.
