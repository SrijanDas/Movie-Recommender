import {
  DIMENSIONS,
  type Dimension,
  type MovieFeatures,
  type RatedMovie,
  type Signal,
} from "./types";

// Favourites are weighted by their position in the user's list: the film at
// the top gets FAVORITE_TOP, the last one FAVORITE_BOTTOM, linearly between.
// The list averages 2, the old flat favourite weight. Tune here.
export const FAVORITE_TOP = 2.5;
export const FAVORITE_BOTTOM = 1.5;

export function favoriteWeight(position: number, count: number): number {
  if (count <= 1) return FAVORITE_TOP;
  return FAVORITE_TOP - ((FAVORITE_TOP - FAVORITE_BOTTOM) * position) / (count - 1);
}

// Favourites in the user's order: by rank, with unranked ones (saved before
// ranking existed) after, in the order given (oldest first from the store).
export function favoritesInOrder<T extends RatedMovie>(movies: T[]): T[] {
  return movies
    .filter((m) => m.signal === "favorite")
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.rank ?? Infinity) - (b.m.rank ?? Infinity) || a.i - b.i)
    .map(({ m }) => m);
}

// Every rated movie with the weight it contributes to the profile.
export function weighMovies<T extends RatedMovie>(rated: T[]): (T & { weight: number })[] {
  const favorites = favoritesInOrder(rated);
  const byPosition = new Map(favorites.map((m, i) => [m.tmdbId, favoriteWeight(i, favorites.length)]));
  return rated.map((m) => ({
    ...m,
    weight: m.signal === "favorite" ? (byPosition.get(m.tmdbId) ?? FAVORITE_BOTTOM) : signalWeight(m.signal),
  }));
}

// How much one movie moves the taste profile. Tune here.
export function signalWeight(signal: Signal): number {
  switch (signal) {
    case "favorite": // only when unranked; see weighMovies
      return (FAVORITE_TOP + FAVORITE_BOTTOM) / 2;
    case "liked": // added on My films, or "Loved it"
      return 1;
    case "up": // "Kinda liked it"
      return 0.5;
    case "no_rewatch": // "Would not rewatch"
      return -0.5;
    case "down": // "Not interested" on a card (formerly "Not for me")
      return -1;
    case "quit": // "Left midway"
      return -1.5;
    case "seen":
    case "watchlist": // saved for later: hidden from recommendations, no taste signal
      return 0;
  }
}

export type ProfileEntry = {
  label: string;
  weight: number;
  sources: string[]; // titles of positively-weighted movies that contributed
};

export type Profile = Record<Dimension, Map<string, ProfileEntry>>;

export type WeightedMovie = {
  title: string;
  features: MovieFeatures;
  weight: number;
};

export function buildProfile(movies: WeightedMovie[]): Profile {
  const profile = Object.fromEntries(
    DIMENSIONS.map((d) => [d, new Map<string, ProfileEntry>()]),
  ) as Profile;

  for (const movie of movies) {
    if (movie.weight === 0) continue;
    for (const dimension of DIMENSIONS) {
      for (const feature of movie.features[dimension]) {
        const entry = profile[dimension].get(feature.key) ?? {
          label: feature.label,
          weight: 0,
          sources: [],
        };
        entry.weight += movie.weight;
        if (movie.weight > 0) entry.sources.push(movie.title);
        profile[dimension].set(feature.key, entry);
      }
    }
  }
  return profile;
}

// The strongest positive features in a dimension, best first.
export function topFeatures(profile: Profile, dimension: Dimension, n: number) {
  return [...profile[dimension].entries()]
    .filter(([, entry]) => entry.weight > 0)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .slice(0, n)
    .map(([key, entry]) => ({ key, ...entry }));
}
