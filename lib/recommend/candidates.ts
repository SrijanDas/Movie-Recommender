import type { TmdbMovieSummary } from "@/lib/tmdb/types";
import { featureId, TV_MOVIE_GENRE } from "./features";
import { topFeatures, type Profile } from "./profile";
import type { MovieSource } from "./source";

const MAX_SEEDS = 12; // liked movies whose related lists we pull
export const MAX_CANDIDATES = 100; // movies we fetch full details for

// How deep into TMDB's paged lists we go. Each page goes further from the
// user's taste, so the feed ends rather than drifting into anything at all.
const MAX_PAGES = 5;
// TMDB pages hold 20 films; rank on page n continues from page n − 1.
const PAGE_SIZE = 20;

export type Seed = { tmdbId: number; weight: number };

export type CandidateSet = {
  ids: number[];
  // candidate id → (seed id → 0-based rank on that seed's recommendations list)
  listedBy: Map<number, Map<number, number>>;
};

// Gather movie ids worth scoring: TMDB's related lists for the user's
// favourites, plus discover queries seeded from the taste profile. Each id
// remembers which seeds' recommendation lists carried it, which later ranks
// it and names the "Because you like …" film. Ids vouched for by stronger
// seeds, higher up their lists, survive the cap. `exclude` holds everything
// rated plus, while scrolling, everything already shown; when that leaves too
// few, the next page of every list is pulled in.
export async function gatherCandidates(
  source: MovieSource,
  profile: Profile,
  seeds: Seed[],
  exclude: Set<number>,
): Promise<CandidateSet> {
  const ids = (features: { key: string }[]) => features.map((f) => featureId(f.key));
  const directors = ids(topFeatures(profile, "director", 3));
  const leads = ids(topFeatures(profile, "lead", 4));
  const genres = ids(topFeatures(profile, "genre", 2));
  const keywords = ids(topFeatures(profile, "tone", 4));
  const topSeeds = seeds.slice(0, MAX_SEEDS);

  const discoverFor = (page: number) => {
    const queries: Promise<TmdbMovieSummary[]>[] = [];
    if (directors.length) queries.push(source.discover({ with_people: directors.join("|") }, page));
    if (leads.length) queries.push(source.discover({ with_people: leads.join("|") }, page));
    if (genres.length || keywords.length) {
      queries.push(
        source.discover(
          { with_genres: genres.slice(0, 1).join(","), with_keywords: keywords.join("|") },
          page,
        ),
      );
    }
    return queries;
  };

  const usable = (movie: TmdbMovieSummary) =>
    !exclude.has(movie.id) && !movie.genre_ids?.includes(TV_MOVIE_GENRE);

  const votes = new Map<number, number>();
  const listedBy = new Map<number, Map<number, number>>();
  const vouch = (id: number, amount: number) => votes.set(id, (votes.get(id) ?? 0) + amount);

  for (let page = 1; page <= MAX_PAGES && votes.size < MAX_CANDIDATES; page++) {
    // One failed TMDB call shouldn't sink the whole list.
    const [related, discovered] = await Promise.all([
      Promise.allSettled(topSeeds.map((seed) => source.getRelated(seed.tmdbId, page))),
      Promise.allSettled(discoverFor(page)),
    ]);
    let found = 0;
    related.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      const seed = topSeeds[i];
      found += result.value.recommendations.length + result.value.similar.length;
      result.value.recommendations.forEach((movie, index) => {
        if (!usable(movie)) return;
        const rank = (page - 1) * PAGE_SIZE + index;
        vouch(movie.id, seed.weight / Math.log2(2 + rank));
        const by = listedBy.get(movie.id) ?? new Map<number, number>();
        if (!by.has(seed.tmdbId)) by.set(seed.tmdbId, rank);
        listedBy.set(movie.id, by);
      });
      for (const movie of result.value.similar) {
        if (usable(movie)) vouch(movie.id, seed.weight * 0.25);
      }
    });
    for (const result of discovered) {
      if (result.status !== "fulfilled") continue;
      found += result.value.length;
      for (const movie of result.value) if (usable(movie)) vouch(movie.id, 0.5);
    }
    if (found === 0) break; // every list has run out
  }

  const kept = [...votes.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);
  return { ids: kept, listedBy };
}
