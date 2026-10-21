// Item-item similarity on IDF-weighted features. Pure.
//
// Each film is a sparse vector per dimension. A feature's weight is its
// inverse document frequency over the films in play (rated + candidates), so
// "Drama", which nearly every film has, counts for little and a director or a
// rare keyword counts for a lot. Two films' similarity is the weighted sum of
// their per-dimension cosines, so DIMENSION_WEIGHTS keeps meaning even though
// a film has one director but twenty keywords.

import { DIMENSIONS, type Dimension, type MovieFeatures } from "./types";

// How much each attribute matters. Sums to 1. Tune here.
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  director: 0.25,
  lead: 0.2,
  genre: 0.2,
  tone: 0.15,
  supporting: 0.1,
  format: 0.1,
};

export type Idf = Map<string, number>;

// log((N + 1) / (df + 1)) + 1: a feature in every film weighs 1, a feature in
// one film out of 130 weighs about 5.
export function buildIdf(corpus: MovieFeatures[]): Idf {
  const df = new Map<string, number>();
  for (const features of corpus) {
    for (const dimension of DIMENSIONS) {
      for (const key of new Set(features[dimension].map((f) => f.key))) {
        df.set(key, (df.get(key) ?? 0) + 1);
      }
    }
  }
  const n = corpus.length;
  return new Map([...df].map(([key, count]) => [key, Math.log((n + 1) / (count + 1)) + 1]));
}

export type Vector = Record<Dimension, { weights: Map<string, number>; norm: number }>;

// Live action is the default format: two live-action films have nothing in
// common for it, so it stays out of the vector (animated and documentary
// still match each other).
export const DEFAULT_FORMAT = "f:live-action";

export function vectorize(features: MovieFeatures, idf: Idf): Vector {
  const vector = {} as Vector;
  for (const dimension of DIMENSIONS) {
    const weights = new Map<string, number>();
    for (const feature of features[dimension]) {
      if (feature.key !== DEFAULT_FORMAT) weights.set(feature.key, idf.get(feature.key) ?? 1);
    }
    let sum = 0;
    for (const w of weights.values()) sum += w * w;
    vector[dimension] = { weights, norm: Math.sqrt(sum) };
  }
  return vector;
}

// Dimension-weighted cosine, in [0, 1]. 1 means the same director, leads,
// genres, keywords, supporting cast and format.
export function similarity(a: Vector, b: Vector): number {
  let total = 0;
  for (const dimension of DIMENSIONS) {
    const x = a[dimension];
    const y = b[dimension];
    if (x.norm === 0 || y.norm === 0) continue;
    let dot = 0;
    const [small, large] = x.weights.size <= y.weights.size ? [x, y] : [y, x];
    for (const [key, w] of small.weights) {
      const v = large.weights.get(key);
      if (v !== undefined) dot += w * v;
    }
    total += (DIMENSION_WEIGHTS[dimension] * dot) / (x.norm * y.norm);
  }
  return Math.min(1, total);
}
