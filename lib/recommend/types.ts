// Shared vocabulary for the recommendation engine. Pure types/constants —
// safe to import from the DB schema, server code, and client components.

// How a user feels about a movie. Stored in `user_movies.signal`.
// favorite: picked on the home screen. liked: added on My films or "Loved it".
// up: "Kinda liked it". no_rewatch: "Would not rewatch". quit: "Left midway".
// down: "Not interested" (on a recommendation card).
// watchlist: saved to watch later; no effect on taste, never recommended.
// Legacy, no longer written: seen (hides a film only).
export const SIGNALS = ["favorite", "liked", "up", "down", "seen", "quit", "no_rewatch", "watchlist"] as const;
export type Signal = (typeof SIGNALS)[number];

// One movie in a user's list.
export type RatedMovie = {
  tmdbId: number;
  signal: Signal;
  // Favourites only: 0 is the film the user loves most. Null/undefined for
  // other signals, or for favourites saved before ranking existed.
  rank?: number | null;
};

// Picks needed before we recommend anything.
export const MIN_FAVORITES = 3;
export const MAX_FAVORITES = 10;

// The attributes a movie is compared on, most important first.
export const DIMENSIONS = [
  "director",
  "lead",
  "genre",
  "tone",
  "supporting",
  "format",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type Feature = {
  key: string; // stable id, e.g. "p:525" (person), "g:878" (genre), "k:4565" (keyword)
  label: string; // human name, e.g. "Christopher Nolan"
};

export type MovieFeatures = Record<Dimension, Feature[]>;

export type Reason = {
  dimension: Dimension;
  text: string; // e.g. "Directed by Denis Villeneuve"
  because: string[]; // titles of liked movies that share this feature
};

export type Recommendation = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
  score: number;
  reasons: Reason[];
};
