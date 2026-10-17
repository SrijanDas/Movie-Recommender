// Shared shapes for a user's movie list. Pure — safe on server and client.

import type { RatedMovie } from "@/lib/recommend/types";

export type MovieSnapshot = {
  title: string;
  posterPath: string | null;
  year: number | null;
};

export type UserMovie = RatedMovie & MovieSnapshot;

// Without an account, the list lives in this browser's localStorage and is
// capped here. Signing in lifts the cap and syncs across devices.
export const GUEST_MOVIE_LIMIT = 25;
