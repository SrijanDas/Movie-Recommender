import "server-only";
import { discover, getRelated } from "@/lib/tmdb/client";
import type { TmdbMovieSummary } from "@/lib/tmdb/types";
import { featureId, TV_MOVIE_GENRE } from "./features";
import { topFeatures, type Profile } from "./profile";

const MAX_SEEDS = 10; // liked movies whose related lists we pull
export const MAX_CANDIDATES = 100; // movies we fetch full details for

// How deep into TMDB's paged lists we go. Each page goes further from the
// user's taste, so the feed ends rather than drifting into anything at all.
const MAX_PAGES = 5;

// Gather movie ids worth scoring: TMDB's related lists for the user's
// favourites, plus discover queries seeded from the taste profile.
// Ids found by more sources come first, so the cap drops the weakest.
// `exclude` holds everything rated plus, while scrolling, everything already
// shown; when that leaves too few, the next page of every list is pulled in.
export async function gatherCandidates(
  profile: Profile,
  seeds: number[],
  exclude: Set<number>,
): Promise<number[]> {
  const ids = (features: { key: string }[]) => features.map((f) => featureId(f.key));
  const directors = ids(topFeatures(profile, "director", 3));
  const leads = ids(topFeatures(profile, "lead", 4));
  const genres = ids(topFeatures(profile, "genre", 2));
  const keywords = ids(topFeatures(profile, "tone", 4));

  const queriesFor = (page: number) => {
    const queries: Promise<TmdbMovieSummary[]>[] = seeds
      .slice(0, MAX_SEEDS)
      .map((id) => getRelated(id, page));
    if (directors.length) queries.push(discover({ with_people: directors.join("|") }, page));
    if (leads.length) queries.push(discover({ with_people: leads.join("|") }, page));
    if (genres.length || keywords.length) {
      queries.push(
        discover(
          {
            with_genres: genres.slice(0, 1).join(","),
            with_keywords: keywords.join("|"),
          },
          page,
        ),
      );
    }
    return queries;
  };

  const hits = new Map<number, number>();
  for (let page = 1; page <= MAX_PAGES && hits.size < MAX_CANDIDATES; page++) {
    // One failed TMDB call shouldn't sink the whole list.
    const results = await Promise.allSettled(queriesFor(page));
    let found = 0;
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      found += result.value.length;
      for (const movie of result.value) {
        // Drop TV movies early so they don't take candidate slots.
        if (exclude.has(movie.id) || movie.genre_ids?.includes(TV_MOVIE_GENRE)) continue;
        hits.set(movie.id, (hits.get(movie.id) ?? 0) + 1);
      }
    }
    if (found === 0) break; // every list has run out
  }

  return [...hits.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);
}
