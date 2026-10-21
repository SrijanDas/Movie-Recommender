import "server-only";
import { isInMyFilms, type UserMovie } from "@/lib/movies/types";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { getMovie } from "@/lib/tmdb/client";

// What a public profile says about someone's taste, from their own list.

export type Taste = {
  // Ranked favourites, best first.
  favorites: UserMovie[];
  seen: number;
  peak: number;
  // Directors behind at least two films they love, most first (up to 2).
  directors: string[];
  // Their most common genres among films they love (up to 3).
  genres: string[];
  // The #1 favourite's wide still, for the profile's backdrop.
  backdropPath: string | null;
  // Every other film they've seen and answered for, newest first. Grouped
  // by answer on the profile.
  seenFilms: UserMovie[];
};

// Films that say the most about taste: favourites, then Peak, then Good movie.
const LOVED = new Set(["favorite", "peak", "liked"]);
const MAX_LOOKUPS = 40;


function top(counts: Map<string, number>, n: number, min = 1) {
  return [...counts]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}

export async function getTaste(movies: UserMovie[]): Promise<Taste> {
  const favorites = favoritesInOrder(movies.filter((m) => m.signal === "favorite"));
  const loved = [
    ...favorites,
    ...movies.filter((m) => m.signal === "peak"),
    ...movies.filter((m) => m.signal === "liked"),
  ].filter((m) => LOVED.has(m.signal)).slice(0, MAX_LOOKUPS);

  // getMovie is cached for weeks and already warm for most saved films.
  const details = await Promise.all(loved.map((m) => getMovie(m.tmdbId).catch(() => null)));
  const directors = new Map<string, number>();
  const genres = new Map<string, number>();
  for (const d of details) {
    if (!d) continue;
    for (const c of d.credits.crew) if (c.job === "Director") directors.set(c.name, (directors.get(c.name) ?? 0) + 1);
    for (const g of d.genres) genres.set(g.name, (genres.get(g.name) ?? 0) + 1);
  }

  return {
    favorites,
    seen: movies.filter(isInMyFilms).length,
    // Favourites count as Peak: they're the films loved most.
    peak: movies.filter((m) => m.signal === "peak" || m.signal === "favorite").length,
    directors: top(directors, 2, 2),
    genres: top(genres, 3),
    backdropPath: details[0]?.backdrop_path ?? null,
    seenFilms: movies.filter((m) => isInMyFilms(m) && m.signal !== "favorite").reverse(),
  };
}
