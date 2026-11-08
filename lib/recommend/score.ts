// Scores one candidate against everything the user has rated. Pure.
//
// Item-item: how close the candidate is to each rated film, weighted by how
// the user felt about it. Closeness is content (`similarity`) plus TMDB's own
// recommendation lists (built from TMDB users' behaviour: a collaborative
// signal). Each taste cluster pulls on its own and the best-fitting one wins,
// so a film that nails one of the user's tastes isn't averaged away by the
// others; disliked films repel; era, language, popularity tier and runtime
// nudge; the strongest pull in the winning cluster names the "Because you
// like …".

import { FAVORITE_TOP, type Profile } from "./profile";
import { DIMENSION_WEIGHTS, similarity, type Idf, type Vector } from "./similarity";
import { rankWeight } from "./candidates";
import type { AffinityScores } from "./affinity";
import { DIMENSIONS, type Dimension, type Reason } from "./types";

// A candidate on a liked film's TMDB recommendations list counts this much at
// the top of the list, falling off with rank. Tune here.
const PROVENANCE_WEIGHT = 0.6;
// Within a cluster, how much the single closest film adds beyond the mean.
const ANCHOR_BONUS = 0.5;
// The most similar disliked film takes this × its pull away.
const REPULSION_WEIGHT = 0.8;
// Nudge toward well-rated films. A 6.5 and an 8.5 differ by 0.04.
const QUALITY_WEIGHT = 0.2;
// Bayesian average: a film with few votes is pulled toward the global mean.
const PRIOR_VOTES = 1000;
const PRIOR_RATING = 6.5;
// Era, language, popularity tier and runtime together: ±0.25 at the extremes.
const AFFINITY_WEIGHT = 0.5;
// How many of the user's films lead here through TMDB's graph.
const SUPPORT_WEIGHT = 0.15;

const MAX_ANCHORS = 2;
const MAX_REASONS = 2;
// A rated film explains a pick only when the two are at least this close
// (content plus TMDB list), so a top favourite's weight alone can't make it
// the reason for everything.
const MIN_ANCHOR_CLOSENESS = 0.3;
// Where affinity reasons rank against feature reasons: above a bare genre
// match, below a shared director, lead or keyword.
const LANGUAGE_REASON_VALUE = 0.6;
const ERA_REASON_VALUE = 0.4;

export type RatedVector = {
  tmdbId: number;
  title: string;
  weight: number;
  vector: Vector;
  // Index of the taste cluster this film belongs to; −1 for disliked films.
  cluster: number;
};

export type Candidate = {
  tmdbId: number;
  vector: Vector;
  voteAverage: number;
  voteCount: number;
  // tmdbId of each rated film whose TMDB recommendations list this film → 0-based rank.
  listedBy: Map<number, number>;
  affinity: AffinityScores;
  // Graph visit weight relative to the batch's best, 0–1.
  support: number;
  // Reasons from the affinity model ("In Korean", "1970s"), if decisive.
  affinityReasons: { dimension: "language" | "era"; text: string }[];
};

export type Scored = {
  score: number;
  // The taste cluster it fits best.
  cluster: number;
  // Rated films that drove the score, strongest first.
  anchors: string[];
  reasons: Reason[];
};

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
  clusterCount: number,
  profile: Profile,
  idf: Idf,
): Scored {
  type Pull = { title: string; value: number; closeness: number };
  const byCluster: Pull[][] = Array.from({ length: clusterCount }, () => []);
  const clusterWeight = new Array<number>(clusterCount).fill(0);
  let repulsion = 0;

  for (const film of rated) {
    let closeness = similarity(candidate.vector, film.vector);
    const rank = candidate.listedBy.get(film.tmdbId);
    if (rank !== undefined) closeness += PROVENANCE_WEIGHT * rankWeight(rank);
    if (film.weight > 0 && film.cluster >= 0) {
      byCluster[film.cluster].push({ title: film.title, value: film.weight * closeness, closeness });
      clusterWeight[film.cluster] += film.weight;
    } else if (film.weight < 0) {
      repulsion = Math.max(repulsion, -film.weight * closeness);
    }
  }

  let taste = 0;
  let cluster = 0;
  for (let k = 0; k < clusterCount; k++) {
    const pulls = byCluster[k];
    if (!pulls.length) continue;
    pulls.sort((a, b) => b.value - a.value);
    const mean = pulls.reduce((sum, p) => sum + p.value, 0) / clusterWeight[k];
    const pull = mean + (ANCHOR_BONUS * pulls[0].value) / FAVORITE_TOP;
    if (pull > taste) {
      taste = pull;
      cluster = k;
    }
  }

  const quality = bayesianRating(candidate.voteAverage, candidate.voteCount) / 10;
  const score =
    taste -
    REPULSION_WEIGHT * repulsion +
    QUALITY_WEIGHT * quality +
    AFFINITY_WEIGHT * (candidate.affinity.mean - 0.5) +
    SUPPORT_WEIGHT * candidate.support;

  const anchorsIn = (pulls: Pull[]) =>
    pulls.filter((p) => p.closeness >= MIN_ANCHOR_CLOSENESS).slice(0, MAX_ANCHORS).map((p) => p.title);
  let anchors = anchorsIn(byCluster[cluster] ?? []);
  if (!anchors.length) anchors = anchorsIn(byCluster.flat().sort((a, b) => b.value - a.value));

  return { score, cluster, anchors, reasons: pickReasons(candidate, profile, idf, anchors) };
}

// The features the candidate shares with films the user likes, strongest
// first: by how much the user likes the feature (relative to the strongest in
// its dimension, so a genre shared by every favourite doesn't outrank a
// director), how specific it is, and whether an anchor film has it too.
// Affinity reasons compete at a fixed value.
function pickReasons(candidate: Candidate, profile: Profile, idf: Idf, anchors: string[]): Reason[] {
  const anchorSet = new Set(anchors);
  const found: (Reason & { value: number })[] = [];
  for (const dimension of DIMENSIONS) {
    let maxWeight = 0;
    for (const entry of profile[dimension].values()) maxWeight = Math.max(maxWeight, entry.weight);
    for (const key of candidate.vector[dimension].weights.keys()) {
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
  for (const reason of candidate.affinityReasons) {
    found.push({
      ...reason,
      because: anchors,
      value: reason.dimension === "language" ? LANGUAGE_REASON_VALUE : ERA_REASON_VALUE,
    });
  }
  // Format is too broad to be a convincing reason unless it's the only match.
  const sorted = found.sort((a, b) => b.value - a.value);
  const specific = sorted.filter((r) => r.dimension !== "format");
  return (specific.length ? specific : sorted)
    .slice(0, MAX_REASONS)
    .map(({ dimension, text, because }) => ({ dimension, text, because }));
}
