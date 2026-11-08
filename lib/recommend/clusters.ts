// Taste clusters: the user's liked films grouped by what they have in
// common. Pure.
//
// One averaged taste fails anyone who likes more than one kind of film (MIND,
// ComiRec: a single user vector "is hard to represent multiple interests").
// Instead each cluster retrieves and scores on its own, and the re-ranker
// gives each a share of the batch. Average-linkage agglomerative clustering,
// which is deterministic and needs no k up front.

import { similarity, type Vector } from "./similarity";

// Two clusters merge while their average similarity is at least this. Tune here.
export const CLUSTER_THRESHOLD = 0.18;
// Never more tastes than this: fewer clusters, each with a real budget.
export const MAX_CLUSTERS = 4;
// A cluster carrying less than this share of the user's positive weight folds
// into its nearest neighbour, so one "Kinda liked it" isn't a taste.
export const MIN_CLUSTER_SHARE = 0.08;

export type Clusterable = { weight: number; vector: Vector };

export type Cluster = {
  // Indices into the input, strongest first.
  members: number[];
  // This cluster's share of the total positive weight, in (0, 1].
  share: number;
};

// Groups positively-weighted films. Films with weight ≤ 0 are ignored (a
// dislike isn't a taste). Returns clusters by share, largest first.
export function clusterFilms(films: Clusterable[]): Cluster[] {
  const positive = films.map((f, i) => i).filter((i) => films[i].weight > 0);
  if (positive.length === 0) return [];

  // Pairwise similarities, then average linkage kept up to date with the
  // Lance–Williams update as clusters merge.
  const n = positive.length;
  const link: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      link[a][b] = link[b][a] = similarity(films[positive[a]].vector, films[positive[b]].vector);
    }
  }
  const groups: number[][] = positive.map((i) => [i]);
  const alive = new Set(groups.map((_, i) => i));

  const closest = () => {
    let best: [number, number] = [-1, -1];
    let bestLink = -Infinity;
    for (const a of alive) {
      for (const b of alive) {
        if (b <= a) continue;
        if (link[a][b] > bestLink) {
          bestLink = link[a][b];
          best = [a, b];
        }
      }
    }
    return { pair: best, link: bestLink };
  };
  const merge = (a: number, b: number) => {
    const sizeA = groups[a].length;
    const sizeB = groups[b].length;
    for (const c of alive) {
      if (c === a || c === b) continue;
      link[a][c] = link[c][a] = (sizeA * link[a][c] + sizeB * link[b][c]) / (sizeA + sizeB);
    }
    groups[a].push(...groups[b]);
    groups[b] = [];
    alive.delete(b);
  };

  while (alive.size > 1) {
    const { pair, link: l } = closest();
    if (l < CLUSTER_THRESHOLD && alive.size <= MAX_CLUSTERS) break;
    merge(pair[0], pair[1]);
  }

  // Fold slivers into their nearest cluster.
  const total = positive.reduce((sum, i) => sum + films[i].weight, 0);
  const weightOf = (g: number) => groups[g].reduce((sum, i) => sum + films[i].weight, 0);
  for (;;) {
    if (alive.size <= 1) break;
    const sliver = [...alive].find((g) => weightOf(g) / total < MIN_CLUSTER_SHARE);
    if (sliver === undefined) break;
    let nearest = -1;
    let nearestLink = -Infinity;
    for (const c of alive) {
      if (c !== sliver && link[sliver][c] > nearestLink) {
        nearestLink = link[sliver][c];
        nearest = c;
      }
    }
    merge(nearest, sliver);
  }

  return [...alive]
    .map((g) => ({
      members: [...groups[g]].sort((x, y) => films[y].weight - films[x].weight),
      share: weightOf(g) / total,
    }))
    .sort((x, y) => y.share - x.share);
}
