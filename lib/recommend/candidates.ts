import "server-only";
import { discover, getRelated } from "@/lib/tmdb/client";
import type { TmdbMovieSummary } from "@/lib/tmdb/types";
import { featureId } from "./features";
import { topFeatures, type Profile } from "./profile";

const MAX_SEEDS = 10; // liked movies whose related lists we pull
export const MAX_CANDIDATES = 100; // movies we fetch full details for

// Gather movie ids worth scoring: TMDB's related lists for the user's
// favourites, plus discover queries seeded from the taste profile.
// Ids found by more sources come first, so the cap drops the weakest.
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

  const queries: Promise<TmdbMovieSummary[]>[] = seeds
    .slice(0, MAX_SEEDS)
    .map((id) => getRelated(id));
  if (directors.length) queries.push(discover({ with_people: directors.join("|") }));
  if (leads.length) queries.push(discover({ with_people: leads.join("|") }));
  if (genres.length || keywords.length) {
    queries.push(
      discover({
        with_genres: genres.slice(0, 1).join(","),
        with_keywords: keywords.join("|"),
      }),
    );
  }

  // One failed TMDB call shouldn't sink the whole list.
  const results = await Promise.allSettled(queries);
  const hits = new Map<number, number>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const movie of result.value) {
      if (exclude.has(movie.id)) continue;
      hits.set(movie.id, (hits.get(movie.id) ?? 0) + 1);
    }
  }

  return [...hits.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);
}
