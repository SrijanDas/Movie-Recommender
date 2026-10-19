import "server-only";
import type { SearchResult } from "@/app/actions";
import { getStarterMovies, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

// The "Add films" picker's grid before you type: popular, acclaimed films.
// Empty when the movie database isn't reachable; search still works then.
export async function getStarterResults(): Promise<SearchResult[]> {
  const starters = isTmdbConfigured() ? await getStarterMovies().catch(() => []) : [];
  return starters.map((m) => ({
    tmdbId: m.id,
    title: m.title,
    year: releaseYear(m.release_date),
    posterPath: m.poster_path,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
  }));
}
