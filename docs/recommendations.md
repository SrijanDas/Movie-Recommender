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
- **Discover:** `discover(params, page)` passes every filter in `DiscoverParams` through (`with_crew`, `with_cast`, `with_people`, `with_genres`, `with_keywords`, `with_original_language`, `primary_release_date.gte/lte`, `vote_count.gte`, `sort_by`; `,` is AND, `|` is OR) and defaults only `sort_by=vote_average.desc` and `include_adult=false`. The caller sets the vote floor: sorted by rating with none, TMDB returns obscure films with a handful of 10/10 votes.
- **Starter grid:** `getStarterMovies()` returns TMDB's 40 most-voted films (`discover`, `sort_by=vote_count.desc`), i.e. the films most people have seen. Onboarding and the landing page's poster wall use it, both at request time (after cookies / `connection()`), so the build never calls TMDB.
- **Images:** posters load straight from TMDB's CDN with `unoptimized` (they're pre-sized), falling back to the title if an image fails.
- **Terms:** the free API is non-commercial and requires visible attribution. It lives on `/credits` (`app/credits/page.tsx`, public, linked from Account and the footer on public pages) together with the JustWatch credit, and nowhere else (CLAUDE.md rule 11).

## Engine: `lib/recommend/`

Retrieve → score → re-rank, the shape every production recommender has. Content-based item-item scoring per **taste cluster**, with TMDB's recommendation graph as the collaborative signal, era / language / popularity-tier / runtime **affinities**, and a re-ranking pass for variety and proportional coverage of each taste. Deterministic, no LLM, and every result explains itself. Design, the research behind it and what it replaced: [superpowers/specs/2026-11-08-recommendation-engine-v3-design.md](superpowers/specs/2026-11-08-recommendation-engine-v3-design.md).

| File | Does |
| --- | --- |
| `types.ts` | `SIGNALS`, `DIMENSIONS`, `RatedMovie`, `Recommendation`, `Reason`. Pure; imported by the DB schema too. |
| `features.ts` | TMDB movie → features per dimension. |
| `profile.ts` | Signal weights and time decay; the taste profile (feature → summed weight, plus the liked titles behind it). |
| `similarity.ts` | `DIMENSION_WEIGHTS`, IDF over the films in play, and the film-to-film similarity. |
| `clusters.ts` | Groups the liked films into up to 4 taste clusters (average-linkage agglomerative). |
| `affinity.ts` | `AffinityModel`: kernel densities over the liked films' year, language, vote count and runtime. |
| `source.ts` | `MovieSource`: the three data calls the engine needs. The app passes the TMDB client. |
| `candidates.ts` | Gathers candidate ids: a two-hop walk over TMDB's recommendation lists plus per-cluster `discover` queries, with provenance. |
| `score.ts` | Scores a candidate against every rated film, per cluster; picks its anchors and reasons. |
| `rerank.ts` | Greedy pick of one batch: diversity (MMR) + genre calibration + cluster calibration + one film per franchise. |
| `index.ts` | `getRecommendations(rated, skip, source?, now?)`: ties it together and returns the next 20. |

### Features (`features.ts`)

| Dimension | Source | Weight (`similarity.ts`) |
| --- | --- | --- |
| director | crew with `job === "Director"` | 0.25 |
| lead | cast billed 1st–2nd | 0.20 |
| genre | `genres` | 0.20 |
| tone | `keywords` (first 20) | 0.15 |
| supporting | cast billed 3rd–8th | 0.10 |
| format | documentary (genre 99) / animated (16) / live action, plus "short" under 40 min. Live action is left out of similarity: two live-action films have nothing in common for it | 0.10 |

There is **no** "feature films only" rule any more: TV movies, specials and shorts are candidates like anything else, and the runtime affinity (below) decides whether they fit the user. The only hard floor is `MIN_CANDIDATE_VOTES` (100): under that, a film's rating and its place on TMDB's lists are noise.

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
| `watchlist` | 0: saved for later from a card's bookmark icon or the film page. Never recommended, no effect on taste. Answering "Seen it" overwrites it, which moves the film off the watchlist. A watchlist row with `started_at` set is being **watched** (see "Watching and the check-in" below) |

**Time decay:** every signal except `favorite` is multiplied by `decay(ratedAt)`: exponential with a 180-day half-life (`HALF_LIFE_DAYS`), floored at 0.35 (`DECAY_FLOOR`), so an answer from a year ago still counts a third. `ratedAt` is the row's `updated_at`, passed through by `getUserMovies`; a missing date means "now". Favourites don't age: they're curated and ranked by hand.

Favourites come from the onboarding picker (saved in the order picked; `setFavorites` also marks onboarding done), from "Add a favourite" on My films, or by tapping ★ on a "Seen it" row (moves the film into favourites, at the bottom). A favourite was seen, so it also lists under "Seen it": it carries its answer in `user_movies.seen_signal` (set to `peak`, `DEFAULT_SEEN_ANSWER`, when it becomes a favourite, replacing any earlier answer), and answering "Seen it" on a favourite changes only that. Taking a film out of the favourites (Edit, or unpicking at onboarding) turns it back into that answer, so it stays under "Seen it"; removing it from "Seen it" deletes it, favourite and all. `seen_signal` has no effect on taste: the favourite weight applies. On My films the Favourites filter (last, after Peak; All is the default) shows them ranked; Edit opens the ranking page: drag to reorder, saved through `reorderFavorites`. Favourites rank as seeds too, so the top ones' related lists are always pulled.

### Pipeline (`index.ts`)

1. **Profile.** Fetch details for every rated movie (weight ≠ 0). Build the profile (feature → summed weight, plus the titles behind it: it seeds the discover queries and labels the reasons; scoring is item-item). Build the user's `AffinityModel` from the liked films.
2. **Taste clusters** (`clusters.ts`). Vectorise the liked films on an IDF over the rated films alone and cluster them by content similarity: average-linkage agglomerative, merging while the closest pair is at least `CLUSTER_THRESHOLD` (0.18) similar and never stopping above `MAX_CLUSTERS` (4); clusters under `MIN_CLUSTER_SHARE` (8 %) of the positive weight fold into their nearest. A lone favourite can be its own taste. Each cluster gets a `ClusterQuery`: its top 2 directors, top 3 leads, top genre, top 4 keywords, its dominant language (one holding > 60 %), its era window (10th–90th percentile years ± 5, only when under 30 years wide) and the median log₁₀ vote count of its films.
3. **Candidates** (`candidates.ts`). Two retrievers with quotas, so neither drowns the other:
   - **Graph walk** over TMDB's recommendation lists (Pixie-style). Hop 1: `getRelated` for the 12 strongest liked films (`MAX_SEEDS`) and the 4 strongest disliked ones (`MAX_NEGATIVE_SEEDS`). A liked seed adds `weight ÷ log₂(2 + rank)` visit to each film on its recommendations list and a quarter of that per similar-list film; a disliked seed *subtracts* the same. Hop 2: the 12 best-visited films (`HOP2_FANOUT`) are expanded in turn at `0.4 ×` (`HOP_DECAY`) their visit. Films reached from several of the user's films accumulate. Each candidate remembers which *rated* films' recommendations lists carried it and at what rank (`listedBy`). TMDB's recommendations list is built from TMDB users' behaviour (its staff say it is "not the same system" as similar, which is genre + keyword overlap), so it is the engine's collaborative-filtering signal.
   - **Per-cluster discover** (`discoverQueries`): up to three queries per cluster, its directors (`with_crew`), its leads (`with_cast`), and its genre AND keywords narrowed to its language and era window when those are sharp. The vote floor follows the cluster's popularity tier: `10^(median log votes − 1)` clamped to [50, 1000] (people queries cap at 200), so a niche taste gets niche films. Each hit earns `0.5 × cluster share`.
   - The 80 best-visited films (`GRAPH_QUOTA`) plus the 40 best discover hits not already in (`DISCOVER_QUOTA`) are fetched, a short side topped up from the other (`MAX_CANDIDATES` = 120). Anything rated, anything under 100 votes, and while scrolling anything already shown is excluded; when that leaves too few, the next page of every list is pulled, up to `MAX_PAGES` (5).
4. **IDF** (`similarity.ts`): over the rated films plus the candidates, each feature weighs `log((N + 1) / (df + 1)) + 1`, so "Drama" counts for about 1 and a director or a rare keyword for about 5. Every film becomes a vector per dimension, and film-to-film **similarity** is `Σ weight_dim × cosine_dim`, in [0, 1].
5. **Score** (`score.ts`) each candidate against every rated film i: `closeness_i = similarity + 0.6 ÷ log₂(2 + rank)` when film i's TMDB recommendations list carries the candidate (`PROVENANCE_WEIGHT`, `rankWeight`). Then per cluster k, `pull_k = Σ_{i∈k} w_i × closeness_i ÷ Σ_{i∈k} w_i + 0.5 × max_{i∈k}(w_i × closeness_i) ÷ FAVORITE_TOP` (`ANCHOR_BONUS`); **taste** = the best `pull_k`, and that cluster is the candidate's. So a film that nails one taste isn't averaged away by the others. **repulsion** = `max_{i: w_i<0} |w_i| × closeness_i`, the most similar disliked film. **affinity** = the mean of the four `AffinityModel` scores (below). **support** = graph visit ÷ the batch's best. `score = taste − 0.8 × repulsion + 0.2 × bayesianRating ÷ 10 + 0.5 × (affinity − 0.5) + 0.15 × support` (`REPULSION_WEIGHT`, `QUALITY_WEIGHT`, `AFFINITY_WEIGHT`, `SUPPORT_WEIGHT`; the rating is shrunk toward 6.5 with a 1,000-vote prior). There is no global popularity bonus.
6. **Anchors and reasons:** `because` holds up to two films from the candidate's cluster, strongest `w × closeness` first, whose closeness is at least 0.3 (`MIN_ANCHOR_CLOSENESS`), falling back to the strongest overall; the card shows "Because you like …". The two reason badges are features the candidate shares with liked films, ranked by dimension weight × the feature's share of the strongest in its dimension × IDF, doubled when an anchor has the feature; never the bare "Live action", and format only when nothing more specific matched. Two affinity reasons compete at fixed values (0.6 and 0.4: above a bare genre, below a shared director or keyword) and fire only when the taste is concentrated: "In Korean" when the user's liked weight in that (non-English) language is ≥ 0.5, and "1970s" when the liked years' standard deviation is under 12 and the candidate's year sits at ≥ 0.8 of the era peak.
7. **Re-rank** (`rerank.ts`): from the scored pool, pick 20 greedily, each maximising `score − 0.5 × max similarity to a picked film − 0.6 × KL(user genre mix ‖ batch genre mix) − 0.8 × KL(cluster shares ‖ batch clusters)` (`DIVERSITY`, `CALIBRATION`, `CLUSTER_CALIBRATION`; KLs smoothed with α = 0.01 as in Steck's calibrated recommendations). The cluster term is what guarantees a two-taste user sees both tastes in every batch. At most one film per TMDB collection (`belongs_to_collection`) per batch, unless only franchise repeats are left. Output order is the pick order, so scores in a batch aren't monotonic.

### Affinities (`affinity.ts`)

Each is a weighted Gaussian kernel density over the liked films, read at the candidate's value and divided by the density at the best-covered liked film, so the user's own peak scores 1. With no data, or a candidate missing the value, a component is 0.5.

| Component | Over | σ | Notes |
| --- | --- | --- | --- |
| era | release year | 8 years | |
| popularity | log₁₀(1 + vote count) | 0.5 (×3 either way) | Replaces a global popularity bonus: someone who loves 300-vote films gets 300-vote films |
| runtime | log₁₀(minutes) | 0.12 (about ±30 %) | Replaces the old hard feature-film filter: keeps 22-minute specials from someone who likes two-hour films, lets them through for someone who likes shorts |
| language | `original_language` share | — | `0.3 + 0.7 × share ÷ max share`, so a language never liked still scores 0.3 |

### Watching and the check-in

"Where to watch" (`components/movies/where-to-watch.tsx`) lists the Free row first, then Stream, then Rent or buy. Every film with an IMDb id (`external_ids` is appended to `getMovie`) also gets a **Stremio** chip at the head of the Free row (`lib/watch/stremio.ts`): Stremio is a free player keyed by IMDb id, so the chip is there even when JustWatch lists nothing free; what actually plays depends on the add-ons the user has installed. Each chip is a client `WatchOption` (`components/movies/watch-option.tsx`): it opens the service in a new tab and, for a member, calls `startWatching(id, label)`, which makes the film a `watchlist` row with `started_at = now()` and `started_via = label` (a favourite or a "Seen it" answer is a rewatch and is left alone; `someday`/`down` rows become watchlist rows). The Stremio chip tries the `stremio:///detail/movie/<imdb>/<imdb>` deep link first and opens `web.stremio.com` on the same path if the page is still visible 1.2 s later (the app didn't take over). Nothing is recorded for signed-out visitors.

Watching films list first on the watchlist (`watchlistOf`, latest started first) with a "Watching" badge on the poster. `putMovies` clears `started_at`/`started_via`/`nudged_at` on any rewrite not carrying them, so an answer or a fresh save ends the watch.

The **check-in** (`components/movies/watch-check-in.tsx`, rendered by `app/(app)/layout.tsx` behind its own `<Suspense>`, so once per app open) picks, via `pickCheckIn` in `lib/watch/check-in.ts`, the most recently started watching film that was started at least 90 minutes ago (`MIN_SINCE_START_MS`) and not snoozed in the last 24 hours (`NUDGE_SNOOZE_MS`), and opens a bottom sheet: "Did you finish <title>?" → **Finished it** (then the six "Seen it" answers, written via `rateRecommendation`, with Undo), **Still watching** (`snoozeWatchCheckIn` sets `nudged_at`; closing the sheet does the same), or **Didn't watch it** (`clearWatching` clears the progress; the film stays saved). None of these revalidate, so the sheet never reappears mid-session.

The recommendation card's poster and title open `/movie/[id]` (TMDB details; title logo, stills, trailer and clips via `getMovieMedia` (one cached `/images` + `/videos` pair, kept out of `getMovie` so engine calls stay small; videos play in place from a thumbnail via `VideoPlayer`, stills open full-screen in `StillsGallery`); cast as a photo row; the banner loops the main backdrop and up to 7 stills in `BannerSlideshow`, crossfading every 6s, still under reduced motion; "Where to watch" via `getWatchProviders` (JustWatch data; country from the host's geo header or the browser language, see `lib/region.ts`; each chip opens that service's own search for the film via `lib/tmdb/provider-links.ts`, never TMDB's JustWatch page), and the same "Seen it" menu, which shows and changes your answer). A ⋯ button over the poster's top-right corner opens "Not interested" (saves `down`) and "Might watch someday" (saves `someday`), both with Undo. The action row is "Seen it" followed by a bookmark icon (`addToWatchlist`, with Undo). "Seen it" opens a dropdown asking how it was, worst to best: "Left midway / Won’t rewatch / Okay, but won’t rewatch / Kinda liked it / Good movie / Peak", and writes `quit`, `no_rewatch`, `okay`, `up`, `liked` or `peak` via `rateRecommendation`. The answers live in `components/movies/feedback.ts`; My films filters its "Seen it" list by the same answers.

### The feed

The page is an infinite feed (`components/movies/recommendation-list.tsx`). The first batch of 20 is computed per request (dynamic, streamed behind `<Suspense>`). Scrolling near the end calls `moreRecommendations` with every id already loaded; the engine treats those like rated films (`getRecommendations(rated, skip)`), so the next batch continues down the ranking instead of repeating it. Each batch reads the user's list fresh, so answers given while scrolling shape the next one. When skipping leaves fewer than `MAX_CANDIDATES`, `gatherCandidates` pulls the next page of every related and discover list, up to `MAX_PAGES` (5); a batch that comes back empty ends the feed. Acting on a card (an answer, "Not interested", "Might watch someday" or the watchlist) leaves it in place, dimmed, saying what was done with an Undo in place of its actions, so the grid never shifts; the next Refresh (or reload) drops it. `rateRecommendation`/`undoRating` deliberately don't revalidate. A Refresh button above the grid (with the count of picks) starts the feed over: it clears the grid, asks for a batch computed from the list as it is now and skipping every film shown this visit (`everShown`, which also drives scrolling), scrolls to the top and shows the new batch; if nothing new comes back, the feed shows its "That’s every film" notice. Reloading the page forgets what was shown. With Cache Components the page stays mounted (React Activity), so Back from a film keeps the scrolled feed. TMDB details are cached, so repeat visits are fast; a cold first visit makes about 190 TMDB calls (rated details, ~30 related lists, ~10 discover queries, 120 candidate details) and takes 8–10 seconds, and each later batch fetches roughly 20–40 new films' details.

`/recommendations` requires at least `MIN_FAVORITES` (3) positive films (favourite, liked or kinda liked) and otherwise links to My films to add more. Search lives on its own page, `/search` (`components/movies/search-view.tsx`), which opens any film's page; the query is kept in `?q=` so Back from a film returns to the same results. My films' filters come from `filterMyFilms` in `lib/movies/types.ts`, which shared lists use too. Search shows every film, including ones already on My films. Before you type, its "Popular and acclaimed" grid shows 30 films picked at random on each visit from the 100 most-voted (`getPopularPool`, cached for weeks).

### Tuning

Constants sit at the top of each module: `DIMENSION_WEIGHTS` in `similarity.ts` (keep them summing to 1, and update PRODUCT.md if the order of importance changes), `signalWeight`, `HALF_LIFE_DAYS` and `DECAY_FLOOR` in `profile.ts`, `CLUSTER_THRESHOLD`/`MAX_CLUSTERS`/`MIN_CLUSTER_SHARE` in `clusters.ts`, the kernel widths in `affinity.ts`, the quotas, hop fan-out and vote floors in `candidates.ts`, the provenance/repulsion/quality/affinity/support weights and anchor threshold in `score.ts`, `DIVERSITY`/`CALIBRATION`/`CLUSTER_CALIBRATION` in `rerank.ts`.

**Running the engine outside Next:** `bun --conditions=react-server scripts/recommend-preview.ts [taste…]` runs `getRecommendations` against TMDB with plain `fetch` for four hand-written tastes (`eclectic`: Ghibli/Pixar plus Korean thrillers; `seventies`; `popcorn`; `horror`) and prints each batch with its anchors and reasons, the TMDB call count and the time. `getRecommendations` takes a `MovieSource` and a `now`, so the script passes its own; `--conditions=react-server` makes `server-only` resolve to its empty build. Never call the real `lib/tmdb/client.ts` from a script: `cacheLife` throws outside Next. Run the preview after changing any constant.

**Not done yet, in order of expected value:** logging impressions and answers so the weights can be learned instead of hand-tuned; plot-overview embeddings as one more similarity dimension for films with sparse keywords (needs an embedding API and a pgvector column); per-user dimension weights (with clusters in place, a per-cluster fit).

## User lists: `lib/movies/store.ts`

The `user_movies` table: one row per user and film, with its `signal` and a title/poster/year snapshot for display. See [database.md](database.md). There is no anonymous list; every user is signed in.

Mutations are Server Actions in `app/actions.ts` (`setFavorites`, `reorderFavorites`, `addFavoriteMovies`, `addLikedMovies`, `rateRecommendation`, `addToWatchlist`, `startWatching`, `snoozeWatchCheckIn`, `clearWatching`, `undoRating`, `removeMovie`, `searchMoviesAction`), wrapped for client components by `components/movies/movie-actions.ts`. Each validates its input and re-checks the id against TMDB before writing.
