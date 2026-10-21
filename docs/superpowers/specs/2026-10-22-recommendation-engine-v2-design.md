# Recommendation engine v2 — design

Date: 2026-10-22. Status: implemented in `lib/recommend/`.

## Why

Every card read "Because you like Interstellar and The Shawshank Redemption". The cause: a reason's
`because` titles were the first three liked films sharing that feature, in list order, and the
features that won were broad ones (a genre, "live action") that every favourite shares. The engine
also summed raw feature overlap, so "Drama" counted as much as a rare keyword or a director, and
TMDB's own recommendation lists were used only to find candidates, never to rank them.

## What production recommenders do (research summary)

Candidate generation → scoring → re-ranking (diversity, calibration, dedup). Netflix's
"Because you watched X" rows are item-item neighbours of one anchor title; MovieLens research
(Sarwar 2001) showed item-item similarity beats user-user and gives explanations for free;
Herlocker 2000 and Tintarev & Masthoff found users trust short, feature-based explanations tied to
their own history. In the cold-start / no-cross-user-logs regime the standard is content-based
filtering with IDF-weighted features and a weighted (Rocchio) profile, hybridised with whatever
collaborative signal is available. TMDB's `/movie/{id}/recommendations` is behaviour-derived
(TMDB staff: it is "not the same system" as `/similar`, which is genre + keyword overlap), so it
is a free item-item collaborative signal. LLMs are not needed for ranking: they add latency, cost,
non-determinism and hallucinated titles; their value here would be optional plot embeddings later.

## Goals

- Every card's "Because you like …" names the liked films that actually drove that pick.
- Rare, specific features (a director, a keyword like "heist") outweigh common ones ("Drama").
- Feedback on every film counts, positive and negative, through item-item similarity.
- TMDB's recommendation lists rank candidates, not just find them.
- A batch of 20 is varied: no five films by one director, no franchise dumps, genre mix
  proportional to the user's taste.
- Deterministic, explainable, no LLM, no new services.

## Non-goals

- Cross-user collaborative filtering (too few users). Logging impressions for future learning
  is a separate task.
- Time decay (ratings carry no timestamp into the engine yet).

## Design

Pipeline per batch (`index.ts`):

1. Fetch details for every rated film; build IDF over the corpus of rated + candidate films.
2. Candidates (`candidates.ts`): TMDB recommendations + similar for the strongest liked films,
   plus discover by top directors / leads / genre+keywords. Keeps provenance: which seed's
   recommendation list listed the candidate, at what rank.
3. Score (`score.ts`): for each candidate and each rated film i, `s_i = sim(c, i) + 0.6 · rankWeight`
   if film i's TMDB recommendations list c. `sim` is a dimension-weighted cosine on
   IDF-weighted features (`similarity.ts`). Then
   `taste = Σ w_i s_i / Σ w_i⁺ + max_i(w_i s_i) / FAVORITE_TOP` (weighted mean plus the strongest
   anchor), `score = taste + 0.3 · bayesianRating`.
4. Reasons: anchors = up to two rated films with the largest positive contribution; feature
   reasons = features the candidate shares with the profile, by weight × IDF, preferring ones
   shared with the anchors; never "Live action".
5. Re-rank (`rerank.ts`): greedy pick of 20 maximising
   `score − λ_div · max sim(c, picked) − λ_cal · KL(p_genre ‖ q_genre(picked + c))`, one film per
   TMDB collection per batch.

`getRecommendations` takes an optional `MovieSource` so the engine runs outside Next (the
scratch harness used to tune the weights).

## Left to the builder

Weights are constants at the top of each module, tuned on a sample taste; see
docs/recommendations.md for the final values.
