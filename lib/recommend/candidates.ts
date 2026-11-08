// Gathers movie ids worth scoring. Several retrievers add "visit" weight to
// ids; the best-visited survive the cap. Nothing here needs the user's
// cross-user data: TMDB's recommendation lists stand in for the item graph.

import type { TmdbMovieSummary } from "@/lib/tmdb/types";
import type { DiscoverParams } from "@/lib/tmdb/client";
import type { MovieSource } from "./source";

// Liked films whose TMDB lists we walk from (strongest first).
const MAX_SEEDS = 12;
// Disliked films whose lists count against what they carry.
const MAX_NEGATIVE_SEEDS = 4;
// Movies we fetch full details for: each retriever gets a quota, so the
// per-taste discover queries aren't drowned out by the graph walk (a top
// TMDB recommendation earns several times a discover hit). A short side is
// topped up from the other.
const GRAPH_QUOTA = 80;
const DISCOVER_QUOTA = 40;
export const MAX_CANDIDATES = GRAPH_QUOTA + DISCOVER_QUOTA;
// Below this many votes a film's rating and its place on TMDB's lists are
// noise, whatever the user's popularity tier.
const MIN_CANDIDATE_VOTES = 100;
// Graph walk, second hop (Pixie-style): how many of the best hop-1 films are
// expanded in turn, and how much a hop-2 visit is worth relative to hop 1.
const HOP2_FANOUT = 12;
const HOP_DECAY = 0.4;
// A film from a cluster's discover query earns this × the cluster's share.
const DISCOVER_VISIT = 0.5;
// Similar lists are genre + keyword overlap: a weak vote.
const SIMILAR_VISIT = 0.25;
// Vote floors for discover: niche tastes get niche films, but never films
// with a handful of 10/10 votes. People queries go lower (filmographies
// are small).
const MIN_VOTE_FLOOR = 50;
const MAX_VOTE_FLOOR = 1000;
const PEOPLE_VOTE_FLOOR = 200;
// How deep into TMDB's paged lists we go while scrolling. Each page goes
// further from the user's taste, so the feed ends rather than drifting.
const MAX_PAGES = 5;
// TMDB pages hold 20 films; rank on page n continues from page n − 1.
const PAGE_SIZE = 20;

export type Seed = { tmdbId: number; weight: number };

// What one taste cluster asks discover for.
export type ClusterQuery = {
  share: number;
  directors: number[];
  leads: number[];
  genre: number | null;
  keywords: number[];
  language: string | null;
  years: [number, number] | null;
  // Median log10 vote count of the cluster's films (null: unknown).
  medianLogVotes: number | null;
};

export type CandidateSet = {
  ids: number[];
  // candidate id → (rated film id → 0-based rank on that film's recommendations list)
  listedBy: Map<number, Map<number, number>>;
  // candidate id → graph visit weight (0 for films discover alone found)
  visits: Map<number, number>;
};

// 1 at the top of a TMDB recommendations list, 0.5 at rank 3, 0.3 at rank 10.
export const rankWeight = (rank: number) => 1 / Math.log2(2 + rank);

const voteFloor = (q: ClusterQuery) =>
  q.medianLogVotes === null
    ? MAX_VOTE_FLOOR
    : Math.round(Math.min(MAX_VOTE_FLOOR, Math.max(MIN_VOTE_FLOOR, 10 ** (q.medianLogVotes - 1))));

// The discover queries for one cluster: its directors, its leads, and its
// genre + keywords narrowed to its language and era when those are sharp.
export function discoverQueries(q: ClusterQuery): DiscoverParams[] {
  const floor = voteFloor(q);
  const queries: DiscoverParams[] = [];
  if (q.directors.length) {
    queries.push({ with_crew: q.directors.join("|"), "vote_count.gte": Math.min(floor, PEOPLE_VOTE_FLOOR) });
  }
  if (q.leads.length) {
    queries.push({ with_cast: q.leads.join("|"), "vote_count.gte": Math.min(floor, PEOPLE_VOTE_FLOOR) });
  }
  if (q.genre !== null || q.keywords.length) {
    const params: DiscoverParams = { "vote_count.gte": floor };
    if (q.genre !== null) params.with_genres = String(q.genre);
    if (q.keywords.length) params.with_keywords = q.keywords.join("|");
    if (q.language) params.with_original_language = q.language;
    if (q.years) {
      params["primary_release_date.gte"] = `${q.years[0]}-01-01`;
      params["primary_release_date.lte"] = `${q.years[1]}-12-31`;
    }
    queries.push(params);
  }
  return queries;
}

// `exclude` holds everything rated plus, while scrolling, everything already
// shown; when that leaves too few, the next page of every list is pulled in.
export async function gatherCandidates(
  source: MovieSource,
  clusters: ClusterQuery[],
  seeds: Seed[],
  negativeSeeds: Seed[],
  exclude: Set<number>,
): Promise<CandidateSet> {
  const topSeeds = seeds.slice(0, MAX_SEEDS);
  const topNegatives = negativeSeeds.slice(0, MAX_NEGATIVE_SEEDS);
  const usable = (movie: TmdbMovieSummary) => !exclude.has(movie.id) && movie.vote_count >= MIN_CANDIDATE_VOTES;

  const visits = new Map<number, number>();
  const discovered = new Map<number, number>();
  const listedBy = new Map<number, Map<number, number>>();
  const visit = (id: number, amount: number) => visits.set(id, (visits.get(id) ?? 0) + amount);
  const ranked = (map: Map<number, number>) => [...map].filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  const found = () => new Set([...ranked(visits), ...ranked(discovered)].map(([id]) => id)).size;

  // One failed TMDB call shouldn't sink the whole list.
  const relatedFor = (ids: number[], page: number) =>
    Promise.allSettled(ids.map((id) => source.getRelated(id, page)));

  // Walk from the seeds: liked films vouch for their lists, disliked films
  // vote against theirs. Hop-1 provenance is kept for scoring and reasons.
  const walk = async (page: number) => {
    const [liked, disliked] = await Promise.all([
      relatedFor(topSeeds.map((s) => s.tmdbId), page),
      relatedFor(topNegatives.map((s) => s.tmdbId), page),
    ]);
    let found = 0;
    liked.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      const seed = topSeeds[i];
      found += result.value.recommendations.length + result.value.similar.length;
      result.value.recommendations.forEach((movie, index) => {
        if (!usable(movie)) return;
        const rank = (page - 1) * PAGE_SIZE + index;
        visit(movie.id, seed.weight * rankWeight(rank));
        const by = listedBy.get(movie.id) ?? new Map<number, number>();
        if (!by.has(seed.tmdbId)) by.set(seed.tmdbId, rank);
        listedBy.set(movie.id, by);
      });
      for (const movie of result.value.similar) {
        if (usable(movie)) visit(movie.id, seed.weight * SIMILAR_VISIT);
      }
    });
    disliked.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      const seed = topNegatives[i];
      result.value.recommendations.forEach((movie, index) => {
        if (usable(movie)) visit(movie.id, -Math.abs(seed.weight) * rankWeight((page - 1) * PAGE_SIZE + index));
      });
    });
    return found;
  };

  // Second hop: the best-visited films' own lists, discounted. Finds films
  // no single seed's list holds, and films several seeds lead to.
  const expand = async () => {
    const parents = ranked(visits).slice(0, HOP2_FANOUT);
    const results = await relatedFor(parents.map(([id]) => id), 1);
    results.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      const [, parentVisit] = parents[i];
      result.value.recommendations.forEach((movie, index) => {
        if (usable(movie)) visit(movie.id, parentVisit * HOP_DECAY * rankWeight(index));
      });
    });
  };

  const discoverAll = async (page: number) => {
    const jobs = clusters.flatMap((c) => discoverQueries(c).map((params) => ({ share: c.share, params })));
    const results = await Promise.allSettled(jobs.map((j) => source.discover(j.params, page)));
    let found = 0;
    results.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      found += result.value.length;
      for (const movie of result.value) {
        if (usable(movie)) discovered.set(movie.id, (discovered.get(movie.id) ?? 0) + DISCOVER_VISIT * jobs[i].share);
      }
    });
    return found;
  };

  for (let page = 1; page <= MAX_PAGES && found() < MAX_CANDIDATES; page++) {
    const [walked, hits] = await Promise.all([walk(page), discoverAll(page)]);
    if (page === 1) await expand();
    if (walked + hits === 0) break; // every list has run out
  }

  // Fill the quotas: the graph's best, then discover's best not already in,
  // then whichever side has more left.
  const graph = ranked(visits).map(([id]) => id);
  const fromDiscover = ranked(discovered)
    .map(([id]) => id)
    .filter((id) => !visits.has(id) || (visits.get(id) ?? 0) <= 0);
  const ids = new Set<number>();
  const take = (from: number[], n: number) => {
    for (const id of from) {
      if (ids.size >= n) break;
      ids.add(id);
    }
  };
  take(graph, GRAPH_QUOTA);
  take(fromDiscover, ids.size + DISCOVER_QUOTA);
  take(graph, MAX_CANDIDATES);
  take(fromDiscover, MAX_CANDIDATES);
  return {
    ids: [...ids],
    listedBy,
    visits: new Map([...ids].map((id) => [id, Math.max(0, visits.get(id) ?? 0)])),
  };
}
