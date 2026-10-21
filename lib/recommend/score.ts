// Scores one candidate against everything the user has rated. Pure.
//
// The score is item-item: how close the candidate is to each rated film,
// weighted by how the user felt about it. Closeness comes from content
// (`similarity`) plus TMDB's own recommendation lists, which are built from
// TMDB users' behaviour and so stand in for collaborative filtering. Liked
// films pull a candidate up, disliked ones push it down, and the strongest
// single pull also becomes the card's "Because you like …".

import { FAVORITE_TOP, type Profile } from "./profile";
import { DIMENSION_WEIGHTS, similarity, type Idf, type Vector } from "./similarity";
import { DIMENSIONS, type Dimension, type Reason } from "./types";

// A candidate on a liked film's TMDB recommendations list counts this much at
// the top of the list, falling off with rank. Tune here.
const PROVENANCE_WEIGHT = 0.6;
// Small nudge toward well-rated films. A 6.5 and an 8.5 differ by 0.06.
const QUALITY_WEIGHT = 0.3;
// Bayesian average: a film with few votes is pulled toward the global mean.
const PRIOR_VOTES = 1000;
const PRIOR_RATING = 6.5;
// Small nudge toward films people have actually seen, on a log scale: 300
// votes earn 0.09, 10,000 earn the full 0.15.
const POPULARITY_WEIGHT = 0.15;
const POPULAR_VOTES = 10_000;

const MAX_ANCHORS = 2;
const MAX_REASONS = 2;
// A rated film explains a pick only when the two are at least this close
// (content plus TMDB list), so a top favourite's weight alone can't make it
// the reason for everything.
const MIN_ANCHOR_CLOSENESS = 0.3;

export type RatedVector = {
  tmdbId: number;
  title: string;
  weight: number;
  vector: Vector;
};

export type Candidate = {
  tmdbId: number;
  vector: Vector;
  voteAverage: number;
  voteCount: number;
  // tmdbId of each rated film whose TMDB recommendations list this film → 0-based rank.
  listedBy: Map<number, number>;
};

export type Scored = {
  score: number;
  // Rated films that drove the score, strongest first.
  anchors: string[];
  reasons: Reason[];
};

// 1 at the top of a TMDB recommendations list, 0.5 at rank 3, 0.3 at rank 10.
export const rankWeight = (rank: number) => 1 / Math.log2(2 + rank);

export function bayesianRating(voteAverage: number, voteCount: number): number {
  const v = voteCount;
  return (v / (v + PRIOR_VOTES)) * voteAverage + (PRIOR_VOTES / (v + PRIOR_VOTES)) * PRIOR_RATING;
}

function reasonText(dimension: Dimension, label: string): string {
  switch (dimension) {
    case "director":
      return `Directed by ${label}`;
    case "lead":
      return `Stars ${label}`;
    case "supporting":
      return `Features ${label}`;
    case "tone":
      return label.charAt(0).toUpperCase() + label.slice(1);
    case "genre":
    case "format":
      return label;
  }
}

export function scoreCandidate(
  candidate: Candidate,
  rated: RatedVector[],
  profile: Profile,
  idf: Idf,
): Scored {
  let pull = 0;
  let positiveWeight = 0;
  const contributions: { title: string; value: number; closeness: number }[] = [];
  for (const film of rated) {
    let closeness = similarity(candidate.vector, film.vector);
    const rank = candidate.listedBy.get(film.tmdbId);
    if (rank !== undefined) closeness += PROVENANCE_WEIGHT * rankWeight(rank);
    const value = film.weight * closeness;
    pull += value;
    if (film.weight > 0) {
      positiveWeight += film.weight;
      contributions.push({ title: film.title, value, closeness });
    }
  }
  const strongest = contributions.sort((a, b) => b.value - a.value);
  const taste = (positiveWeight ? pull / positiveWeight : 0) + (strongest[0]?.value ?? 0) / FAVORITE_TOP;
  const quality = bayesianRating(candidate.voteAverage, candidate.voteCount) / 10;
  const popularity = Math.min(1, Math.log10(1 + candidate.voteCount) / Math.log10(1 + POPULAR_VOTES));
  const score = taste + QUALITY_WEIGHT * quality + POPULARITY_WEIGHT * popularity;

  const anchors = strongest
    .filter((c) => c.closeness >= MIN_ANCHOR_CLOSENESS)
    .slice(0, MAX_ANCHORS)
    .map((c) => c.title);

  return { score, anchors, reasons: pickReasons(candidate.vector, profile, idf, anchors) };
}

// The features the candidate shares with films the user likes, strongest
// first: by how much the user likes the feature (relative to the strongest in
// its dimension, so a genre shared by every favourite doesn't outrank a
// director), how specific it is, and whether an anchor film has it too.
function pickReasons(vector: Vector, profile: Profile, idf: Idf, anchors: string[]): Reason[] {
  const anchorSet = new Set(anchors);
  const found: (Reason & { value: number })[] = [];
  for (const dimension of DIMENSIONS) {
    let maxWeight = 0;
    for (const entry of profile[dimension].values()) maxWeight = Math.max(maxWeight, entry.weight);
    for (const key of vector[dimension].weights.keys()) {
      const entry = profile[dimension].get(key);
      if (!entry || entry.weight <= 0) continue;
      const sources = [...new Set(entry.sources)];
      const viaAnchor = sources.filter((title) => anchorSet.has(title));
      found.push({
        dimension,
        text: reasonText(dimension, entry.label),
        because: [...viaAnchor, ...sources.filter((t) => !anchorSet.has(t))].slice(0, 3),
        value:
          DIMENSION_WEIGHTS[dimension] * (entry.weight / maxWeight) * (idf.get(key) ?? 1) * (viaAnchor.length ? 2 : 1),
      });
    }
  }
  // Format is too broad to be a convincing reason unless it's the only match.
  const sorted = found.sort((a, b) => b.value - a.value);
  const specific = sorted.filter((r) => r.dimension !== "format");
  return (specific.length ? specific : sorted)
    .slice(0, MAX_REASONS)
    .map(({ dimension, text, because }) => ({ dimension, text, because }));
}
