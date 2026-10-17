import type { Profile } from "./profile";
import { DIMENSIONS, type Dimension, type MovieFeatures, type Reason } from "./types";

// How much each attribute matters. Sums to 1. Tune here.
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  director: 0.25,
  lead: 0.2,
  genre: 0.2,
  tone: 0.15,
  supporting: 0.1,
  format: 0.1,
};

// Small nudge toward well-rated movies so ties break sensibly.
const QUALITY_WEIGHT = 0.05;
const CONFIDENT_VOTE_COUNT = 500;

const MAX_REASONS = 2;

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

export type ScoreInput = {
  features: MovieFeatures;
  voteAverage: number;
  voteCount: number;
};

export function scoreMovie(
  movie: ScoreInput,
  profile: Profile,
): { score: number; reasons: Reason[] } {
  let score = 0;
  const contributions: (Reason & { value: number })[] = [];

  for (const dimension of DIMENSIONS) {
    const entries = profile[dimension];
    if (entries.size === 0) continue;

    // Normalize by the strongest feature in this dimension so a profile
    // built from many movies doesn't drown out one built from a few.
    let maxWeight = 1;
    for (const entry of entries.values()) maxWeight = Math.max(maxWeight, Math.abs(entry.weight));

    let similarity = 0;
    for (const feature of movie.features[dimension]) {
      const entry = entries.get(feature.key);
      if (!entry) continue;
      const share = entry.weight / maxWeight;
      similarity += share;
      // Live action is the default format, so it never explains anything.
      if (share > 0 && feature.key !== "f:live-action") {
        contributions.push({
          dimension,
          text: reasonText(dimension, feature.label),
          because: [...new Set(entry.sources)].slice(0, 3),
          value: DIMENSION_WEIGHTS[dimension] * share,
        });
      }
    }
    score += DIMENSION_WEIGHTS[dimension] * Math.min(1, Math.max(-1, similarity));
  }

  const confidence = Math.min(1, movie.voteCount / CONFIDENT_VOTE_COUNT);
  score += QUALITY_WEIGHT * (movie.voteAverage / 10) * confidence;

  // Format is too broad to be a convincing reason on its own unless it's
  // the only thing that matched (e.g. "Animated").
  const sorted = contributions.sort((a, b) => b.value - a.value);
  const specific = sorted.filter((c) => c.dimension !== "format");
  const reasons = (specific.length > 0 ? specific : sorted)
    .slice(0, MAX_REASONS)
    .map(({ dimension, text, because }) => ({ dimension, text, because }));

  return { score, reasons };
}
