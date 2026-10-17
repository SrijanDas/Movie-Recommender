import {
  DIMENSIONS,
  type Dimension,
  type MovieFeatures,
  type Signal,
} from "./types";

// How much one movie moves the taste profile. Tune here.
export function signalWeight(signal: Signal): number {
  switch (signal) {
    case "favorite":
      return 2;
    case "liked":
    case "up":
      return 1;
    case "down":
      return -1;
    case "seen":
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
