// Shared shapes for a user's movie list. Pure — safe on server and client.

import type { RatedMovie } from "@/lib/recommend/types";

export type MovieSnapshot = {
  title: string;
  posterPath: string | null;
  year: number | null;
};

export type UserMovie = RatedMovie & MovieSnapshot;

// TMDB's audience score. Not stored (scores drift): pages add it from the
// cached TMDB details with withScores() before showing a list.
export type TmdbScore = { voteAverage: number; voteCount: number };
export type ListedMovie = UserMovie & Partial<TmdbScore>;
