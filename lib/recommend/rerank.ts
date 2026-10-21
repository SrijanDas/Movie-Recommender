// Turns a scored candidate pool into one varied batch. Pure.
//
// Greedy, like Netflix's page assembly: each pick is scored against what's
// already picked. Two penalties: similarity to a picked film (MMR, so one
// director or franchise can't fill the batch) and genre miscalibration
// (Steck 2018: the batch's genre mix should follow the user's, so a
// 70% drama / 30% horror taste doesn't get 20 dramas).

import { similarity, type Vector } from "./similarity";

// Weight of the MMR penalty against the score. Tune here.
const DIVERSITY = 0.5;
// Weight of the genre-calibration penalty. Tune here.
const CALIBRATION = 0.6;
// Smoothing so a genre the batch lacks doesn't make the KL term infinite.
const SMOOTHING = 0.01;

export type Rankable = {
  score: number;
  vector: Vector;
  genres: string[];
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

// KL(p ‖ q̃) with q̃ = (1 − α) q + α p, from the picked films' genre counts.
function miscalibration(target: Map<string, number>, counts: Map<string, number>, picked: number): number {
  let kl = 0;
  for (const [genre, p] of target) {
    const q = picked ? (counts.get(genre) ?? 0) / picked : 0;
    kl += p * Math.log(p / ((1 - SMOOTHING) * q + SMOOTHING * p));
  }
  return kl;
}

export function rerank<T extends Rankable>(pool: T[], count: number, target: Map<string, number>): T[] {
  const remaining = [...pool].sort((a, b) => b.score - a.score);
  const picked: T[] = [];
  const collections = new Set<number>();
  const counts = new Map<string, number>();
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
      const trial = new Map(counts);
      for (const genre of film.genres) {
        trial.set(genre, (trial.get(genre) ?? 0) + 1 / film.genres.length);
      }
      const kl = miscalibration(target, trial, pickedGenreShares + (film.genres.length ? 1 : 0));
      const value = film.score - DIVERSITY * nearest - CALIBRATION * kl;
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
    for (const genre of film.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1 / film.genres.length);
    if (film.genres.length) pickedGenreShares++;
  }
  return picked;
}
