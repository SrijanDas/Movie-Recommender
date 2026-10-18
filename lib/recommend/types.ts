// Shared vocabulary for the recommendation engine. Pure types/constants —
// safe to import from the DB schema, server code, and client components.

// How a user feels about a movie. Stored in `user_movies.signal`.
// favorite: picked on the home screen. liked: added on My films or "Good movie"
// (was "Loved it"). peak: "Peak".
// up: "Kinda liked it". okay: "Okay, but won’t rewatch".
// no_rewatch: "Won’t rewatch". quit: "Left midway".
// down: "Not interested" (on a recommendation card).
// someday: "Might watch someday" (on a recommendation card): hidden from
// recommendations, no effect on taste, not listed anywhere.
// watchlist: saved to watch later; no effect on taste, never recommended.
// Legacy, no longer written: seen (hides a film only).
export const SIGNALS = ["favorite", "liked", "up", "down", "seen", "quit", "no_rewatch", "watchlist", "someday", "peak", "okay"] as const;
export type Signal = (typeof SIGNALS)[number];

// One movie in a user's list.
export type RatedMovie = {
  tmdbId: number;
  signal: Signal;
  // Favourites only: 0 is the film the user loves most. Null/undefined for
  // other signals, or for favourites saved before ranking existed.
  rank?: number | null;
  // Favourites only: the "Seen it" answer it also carries (one of
  // SEEN_ANSWERS). Null/undefined for other signals.
  seenSignal?: Signal | null;
};

// The answers to "Seen it", worst to best. A favourite carries one in
// seenSignal (DEFAULT_SEEN_ANSWER when it was never answered) and turns back
// into it when it leaves the favourites.
export const SEEN_ANSWERS = ["quit", "no_rewatch", "okay", "up", "liked", "peak"] as const;
export type SeenAnswer = (typeof SEEN_ANSWERS)[number];
export const DEFAULT_SEEN_ANSWER: SeenAnswer = "peak";
export const isSeenAnswer = (signal: Signal | null | undefined): signal is SeenAnswer =>
  SEEN_ANSWERS.includes(signal as SeenAnswer);

// Picks needed before we recommend anything.
export const MIN_FAVORITES = 3;
// The most favourites a list can hold, at onboarding and in My films.
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
  voteCount: number;
  score: number;
  reasons: Reason[];
};
