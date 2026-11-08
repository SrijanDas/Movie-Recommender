# Recommendation engine v3 — design

Date: 2026-11-08. Status: implemented in `lib/recommend/`. Supersedes
[2026-10-22-recommendation-engine-v2-design.md](2026-10-22-recommendation-engine-v2-design.md).

## Why

v2 gave everyone the same canon. Four causes, all in the engine:

1. **One averaged taste.** A candidate was scored by its weighted mean closeness to *every* rated film. For
   anyone who likes more than one kind of film (most people) the mean washes out: a film that is a perfect
   match for the "Korean thrillers" third of a list scores low because it matches nothing in the "Pixar"
   two-thirds. A `max` term patched this but it also let the #1 favourite explain everything.
2. **A narrow, mainstream candidate pool.** 100 candidates, mostly from TMDB's recommendation lists for 12
   seeds (which skew to blockbusters) and three `discover` queries that demanded ≥ 1,000 votes and sorted by
   rating, i.e. the same top-rated films for every user. On top of that a universal popularity bonus pushed
   whatever survived toward the already-seen.
3. **Half of taste was ignored.** Era, language/country, how mainstream a film is, and how long it is were not
   modelled at all. Someone whose favourites are three 1970s Italian films got 2020s Hollywood.
4. **No time, weak dislikes.** Ratings never aged, so an answer from day one weighed as much as yesterday's.
   A "Left midway" only lowered the mean a little; nothing stopped a near-identical film coming next.

Also, a hard "feature films only" rule (no TV movies, nothing under 60 minutes) threw out films people
wanted. That rule is removed; a soft runtime affinity takes its place.

## What the best systems do (research summary)

- **Multi-stage: retrieve → score → re-rank.** Netflix, YouTube and Pinterest all run several candidate
  generators in parallel, score the union with a richer model, then assemble the page under diversity and
  calibration constraints. Netflix's 2025 workshop described consolidating rankers into one multi-task model
  but kept the stage structure; its page assembly remains greedy, row by row.
- **Multiple interests per user, not one vector.** MIND (Alibaba, 2019) and ComiRec (KDD 2020) cluster a
  user's history into several interest vectors and retrieve candidates *per interest*, then merge; a single
  user embedding "is hard to represent multiple interests". Netflix's "Because you watched X" rows are the
  same idea done by hand: one anchor per row.
- **Graph walks over item-item edges.** Pinterest's Pixie runs biased random walks with restarts from the
  user's items over the item graph and ranks by visit count. Two hops find items that no single neighbour
  list contains, and multiple seeds reinforce items reached from several of them. TMDB's
  `/movie/{id}/recommendations` is an item-item graph built from TMDB users' behaviour (TMDB staff: "not the
  same system" as `/similar`, which is genre + keyword overlap), so it is a free, if coarse, collaborative
  graph to walk.
- **Calibration and diversity at re-rank.** Steck (RecSys 2018) showed a greedy re-rank that keeps a list's
  genre mix proportional to the user's history; Spotify and Netflix frame the same trade-off as maximal
  marginal relevance with a KL penalty. Steck's own motivating example is a 70 % romance / 30 % action user
  who should not get 20 romances.
- **Popularity bias is a known failure, and the fix is per-user.** Inverse-propensity methods down-weight
  popular items globally, which over-suppresses them for users who genuinely like blockbusters. The
  practical alternative is to treat popularity as a taste attribute: match each user's own popularity
  profile instead of adding a global prior.
- **Time matters.** Koren's temporal-dynamics work (Netflix Prize) and later item-kNN deployments weight
  recent ratings more, usually with an exponential decay.
- **Text embeddings help sparse metadata** (an SBERT + CF hybrid beat both parts on MovieLens 1M, most when
  history was short), but they need an embedding service (Anthropic has none; it points to Voyage AI),
  storage, and a backfill. Not in this version; see "Later".

## Goals

- Someone with two or three distinct tastes gets each of them served, in proportion.
- Candidates come from several retrievers per taste, including a two-hop walk over TMDB's recommendation
  graph and per-taste `discover` queries, so the pool is wide and not just the canon.
- Era, language, popularity tier and runtime are part of a user's taste and shape the ranking.
- Recent answers count more than old ones; favourites never age.
- A strong dislike actively repels near-identical films.
- No hard "feature film" filter.
- Still deterministic, explainable, no LLM, no new services, same `MovieSource` interface.

## Non-goals

- Cross-user collaborative filtering (too few users).
- Plot-overview embeddings (needs a service and a store; see "Later").
- Changing the recommendation card or any screen. The `Recommendation` shape is unchanged.

## Design

### Inputs

`RatedMovie` gains an optional `ratedAt` (the row's `updated_at`), which `getUserMovies` now passes
through. Nothing else about the list changes.

`TmdbMovieDetails` and `TmdbMovieSummary` gain `original_language`. `DiscoverParams` grows to cover
`with_crew`, `with_cast`, `with_original_language`, `primary_release_date.gte/lte`, `vote_count.gte` and
`sort_by`; the client's hard-coded ≥ 1,000 votes / no-TV-movie / ≥ 60 min filters move out of the client
and into whatever the engine asks for.

### 1. Profile (`profile.ts`)

- **Weight** = `signalWeight(signal) × decay(age)`. `decay` is exponential with a 180-day half-life, floored
  at 0.35, so an answer from a year ago still counts a third. Favourites don't decay: they're curated and
  ranked by hand.
- **Taste clusters** (`clusters.ts`): positively-weighted films are grouped by content similarity with
  average-linkage agglomerative clustering, merging while the closest pair of clusters is at least
  `CLUSTER_THRESHOLD` (0.18) similar, and never below `MAX_CLUSTERS` (4) unless already there. Each cluster
  carries its films, its weight share, its top features per dimension, its genre mix, and its era /
  language / popularity profile. A single film can be its own cluster (a lone favourite is still a taste).
  Clusters whose share is under 8 % fold into the nearest cluster so a one-off "Kinda liked it" doesn't get
  a retrieval budget.
- **Affinities** (`affinity.ts`), each a function of a candidate returning [0, 1], computed from the
  positively-weighted films:
  - *era*: Gaussian kernel density over release year (σ = 8), normalised by the peak.
  - *language*: weight share of the candidate's `original_language`, mapped to `0.3 + 0.7 × share / maxShare`
    so a language the user has never liked still scores 0.3 rather than 0.
  - *popularity tier*: kernel density over `log10(vote_count)` (σ = 0.5), normalised. This replaces v2's
    universal popularity bonus.
  - *runtime*: kernel density over `log10(runtime)` (σ = 0.12, about ±30 %), normalised. Unknown runtime
    scores 0.5. This is what keeps 22-minute specials away from someone who likes two-hour films, and what
    lets them through for someone who likes shorts.

### 2. Candidates (`candidates.ts`)

Two retrievers, each with a quota of the `MAX_CANDIDATES` (120) whose details are fetched: the
`GRAPH_QUOTA` (80) best-visited films from the walk plus the `DISCOVER_QUOTA` (40) best discover hits
not already in, a short side topped up from the other. Quotas rather than one merged ranking because
a top-of-list TMDB recommendation earns several times a discover hit, and without them the per-taste
queries never made the cut (the first run of the harness showed a 1970s taste getting 80s/90s films).
Films under `MIN_CANDIDATE_VOTES` (100) are dropped at the summary stage: below that a rating and a place
on a TMDB list are noise, whatever the user's popularity tier.

1. **Graph walk** over TMDB recommendations, Pixie-style:
   - Hop 1: `getRelated` for the top `MAX_SEEDS` (12) positive films by weight, plus the top `MAX_NEGATIVE_SEEDS`
     (4) negative films. A positive seed adds `w × rankWeight(rank)` to each film on its recommendations list
     and a quarter of that for its similar list; a negative seed *subtracts* `|w| × rankWeight(rank)`.
   - Hop 2: the `HOP2_FANOUT` (12) best-visited hop-1 films are themselves expanded; their lists add
     `visit(parent) × HOP_DECAY (0.4) × rankWeight(rank)`. Films reached from several seeds accumulate.
   - Provenance (`listedBy`: which *rated* film's recommendations list carried the candidate, at what rank)
     is kept for hop 1 as before, for scoring and explanations.
2. **Per-cluster discover**, one or two queries per cluster, sized to that cluster:
   - its top director(s) via `with_crew` (OR), and its top leads via `with_cast` (OR);
   - its top genre AND its top keywords (OR), narrowed by `with_original_language` when one non-English
     language holds > 60 % of the cluster, and by `primary_release_date` to the cluster's 10th–90th
     percentile years ± 5 when that window is under 30 years wide;
   - `vote_count.gte` set from the cluster's popularity tier: `10^(median log10 votes − 1)`, clamped to
     [50, 1000], so a niche taste gets niche films; `sort_by = vote_average.desc`.
   Each hit adds `0.5 × clusterShare` discover weight, so clusters get candidate budget in proportion.
3. While scrolling, as in v2, `exclude` holds everything shown and the next page of every list is pulled
   when fewer than `MAX_CANDIDATES` remain, up to `MAX_PAGES` (5).

Anything the user has rated is excluded. There is **no** TV-movie or runtime filter.

`support` (used in scoring) is the graph visit weight; a film discover alone found has 0 and relies on
its content match.

### 3. Scoring (`score.ts`)

For candidate *c* and rated film *i*: `closeness_i = sim(c, i) + PROVENANCE × rankWeight(rank_i)` when *i*'s
recommendations list carries *c* (unchanged).

- **Per-cluster pull**: `pull_k = Σ_{i∈k} w_i × closeness_i ÷ Σ_{i∈k} w_i` over the cluster's films, plus
  `max_{i∈k}(w_i × closeness_i) ÷ FAVORITE_TOP × ANCHOR_BONUS (0.5)` so one very close film still lifts it.
- **taste** = `max_k pull_k`; the winning cluster is the candidate's `cluster`. Re-ranking makes the batch
  cover clusters in proportion, so scoring can simply ask "how well does this fit the taste it fits best?"
- **repulsion** = `max_{i: w_i<0} |w_i| × closeness_i`: the most similar disliked film. A "Left midway" on a
  near-twin outweighs a "Good movie" on a distant cousin.
- **affinity** = mean of era, language, popularity-tier and runtime affinities.
- **support** = graph visit weight ÷ the batch's max visit, in [0, 1]: how many of the user's films lead
  to this one through TMDB's graph.
- `score = taste − REPULSION (0.8) × repulsion + QUALITY (0.2) × bayesianRating/10 + AFFINITY (0.5) × (affinity − 0.5) + SUPPORT (0.15) × support`.

There is no global popularity term.

### 4. Explanations (`score.ts`)

- `because`: up to two films from the *winning cluster*, strongest `w × closeness` first, with closeness ≥
  `MIN_ANCHOR_CLOSENESS` (0.3). Falls back to the strongest overall if the cluster has none above the bar.
- Reasons: as v2 (features shared with liked films, weighted by dimension × share × IDF, doubled when an
  anchor has it, never bare "Live action"), with two additions that fire only when an affinity is
  decisive: a language reason ("In Korean") when the user's language share for it is ≥ 0.5 and it isn't
  English, and an era reason ("1970s") when the era kernel at the candidate's year is ≥ 0.8 and the user's
  year spread (std) is under 12. `Reason.dimension` becomes `Dimension | "language" | "era"`; the card
  doesn't read it.

### 5. Re-rank (`rerank.ts`)

Greedy pick of 20 maximising
`score − DIVERSITY (0.5) × max sim(c, picked) − CALIBRATION (0.6) × KL(genre target ‖ batch) − CLUSTER_CAL (0.8) × KL(cluster shares ‖ batch clusters)`,
one film per TMDB collection per batch (franchise repeats allowed only when nothing else is left). The
cluster-calibration term is what guarantees a two-taste user sees both tastes in every batch of 20.

### Cost

Cold, for a 10-film list, the harness measured 160–185 TMDB calls (rated details, 16 `getRelated` for hop
1, 12 for hop 2, ~10 `discover`, 120 candidate details) in 5–9 s with plain `fetch` and 8 in flight. All of it is cached for days/weeks, so a second
visit is a few hundred milliseconds, and most of a user's rated films are already cached from the day
they were saved.

### Tuning harness

`scripts/recommend-preview.ts` runs the engine against TMDB with plain `fetch` for four hand-written
tastes (`eclectic`: Ghibli/Pixar + Korean thrillers; `seventies`; `popcorn`; `horror` with an old dislike)
and prints each batch with anchors, reasons, score, rating and vote count, plus the call count and time.
It is how the constants above were set; run it after changing any.

## Builder's calls

- Retriever quotas (80/40) and the 100-vote floor, added after the first harness run (see "Candidates").
- Hop-2 fan-out set to 12 (from 16) to keep a cold batch under 10 s.
- Kernel widths and the cluster threshold kept at the values above: the harness showed the eclectic taste
  splitting into Ghibli / Pixar / Korean-thriller clusters and the horror taste staying in one.

## Later

- **Plot embeddings** as a seventh similarity dimension (Voyage or any embedding API, stored per TMDB id in
  Postgres with pgvector), for films with sparse keywords.
- **Logging impressions and answers** so the constants can be fit instead of hand-tuned.
- **Per-user dimension weights** (PRODUCT.md "Later"): with clusters in place, learning that one user
  follows directors and another follows actors is a per-cluster weight fit.

## Sources

- Steck, *Calibrated Recommendations*, RecSys 2018; da Silva & Jannach, *Calibrated Recommendations: Survey
  and Future Directions*, 2025 (arXiv 2507.02643).
- Eksombatchai et al., *Pixie: A System for Recommending 3+ Billion Items to 200+ Million Users in
  Real-Time*, WWW 2018 (arXiv 1711.07601).
- Li et al., *Multi-Interest Network with Dynamic Routing (MIND)*, CIKM 2019; Cen et al., *Controllable
  Multi-Interest Framework for Recommendation (ComiRec)*, KDD 2020 (arXiv 2005.09347).
- Koren, *Collaborative Filtering with Temporal Dynamics*, KDD 2009.
- Shaped.ai, *Key insights from the Netflix Personalization, Search & Recommendation Workshop 2025*; Netflix
  Tech Blog, *GenRec: Towards LLM-Native Recommendation at Netflix*.
- *A Hybrid Model for Movies Recommendations, Utilizing SBERT and Collaborative Filtering*, Springer 2026.
- *Post-hoc Popularity Bias Correction*, 2025 (arXiv 2510.12959); *Unbiased Collaborative Filtering with
  Fair Sampling*, 2025 (arXiv 2502.13840).
- TMDB API reference, `/discover/movie`.
