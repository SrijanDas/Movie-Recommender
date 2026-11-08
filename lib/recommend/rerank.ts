// Turns a scored candidate pool into one varied batch. Pure.
//
// Greedy, like Netflix's page assembly: each pick is scored against what's
// already picked. Three penalties: similarity to a picked film (MMR, so one
// director or franchise can't fill the batch), genre miscalibration (Steck
// 2018: the batch's genre mix should follow the user's, so a 70% drama / 30%
// horror taste doesn't get 20 dramas), and taste-cluster miscalibration (the
// same idea over the user's tastes, so each gets its share of every batch).

import { similarity, type Vector } from "./similarity";

// Weight of the MMR penalty against the score. Tune here.
const DIVERSITY = 0.5;
// Weight of the genre-calibration penalty. Tune here.
const CALIBRATION = 0.6;
// Weight of the cluster-calibration penalty. Tune here.
const CLUSTER_CALIBRATION = 0.8;
// Smoothing so a share the batch lacks doesn't make the KL term infinite.
const SMOOTHING = 0.01;

export type Rankable = {
  score: number;
  vector: Vector;
  genres: string[];
  // The taste cluster it fits best.
  cluster: number;
  // TMDB collection (franchise) id, if any. One film per collection per batch.
  collection: number | null;
};

// The user's genre mix: each liked film spreads its weight evenly over its
// genres (p(g|u) in Steck's notation).
export function genreTarget(liked: { weight: number; genres: string[] }[]): Map<string, number> {
  const target = new Map<string, number>();
  let total = 0;
  for (const film of liked) {
    if (film.weight <= 0 || film.genres.length === 0) continue;
    for (const genre of film.genres) {
      target.set(genre, (target.get(genre) ?? 0) + film.weight / film.genres.length);
    }
    total += film.weight;
  }
  for (const [genre, weight] of target) target.set(genre, weight / total);
  return target;
}

// KL(p ‖ q̃) with q̃ = (1 − α) q + α p, from the picked films' counts.
function miscalibration<K>(target: Map<K, number>, counts: Map<K, number>, picked: number): number {
  let kl = 0;
  for (const [key, p] of target) {
    const q = picked ? (counts.get(key) ?? 0) / picked : 0;
    kl += p * Math.log(p / ((1 - SMOOTHING) * q + SMOOTHING * p));
  }
  return kl;
}

export function rerank<T extends Rankable>(
  pool: T[],
  count: number,
  genres: Map<string, number>,
  clusters: Map<number, number>,
): T[] {
  const remaining = [...pool].sort((a, b) => b.score - a.score);
  const picked: T[] = [];
  const collections = new Set<number>();
  const genreCounts = new Map<string, number>();
  const clusterCounts = new Map<number, number>();
  let pickedGenreShares = 0;

  while (picked.length < count && remaining.length > 0) {
    let best = -1;
    let bestValue = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const film = remaining[i];
      if (film.collection !== null && collections.has(film.collection)) continue;
      let nearest = 0;
      for (const p of picked) nearest = Math.max(nearest, similarity(film.vector, p.vector));
      // Miscalibration if this film joined the batch.
      const genreTrial = new Map(genreCounts);
      for (const genre of film.genres) {
        genreTrial.set(genre, (genreTrial.get(genre) ?? 0) + 1 / film.genres.length);
      }
      const genreKl = miscalibration(genres, genreTrial, pickedGenreShares + (film.genres.length ? 1 : 0));
      const clusterTrial = new Map(clusterCounts);
      clusterTrial.set(film.cluster, (clusterTrial.get(film.cluster) ?? 0) + 1);
      const clusterKl = miscalibration(clusters, clusterTrial, picked.length + 1);
      const value = film.score - DIVERSITY * nearest - CALIBRATION * genreKl - CLUSTER_CALIBRATION * clusterKl;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    if (best === -1) {
      // Only franchise repeats are left: allow them rather than end short.
      collections.clear();
      continue;
    }
    const [film] = remaining.splice(best, 1);
    picked.push(film);
    if (film.collection !== null) collections.add(film.collection);
    for (const genre of film.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1 / film.genres.length);
    if (film.genres.length) pickedGenreShares++;
    clusterCounts.set(film.cluster, (clusterCounts.get(film.cluster) ?? 0) + 1);
  }
  return picked;
}
