// Shared shapes for a user's movie list. Pure — safe on server and client.

import { favoritesInOrder } from "@/lib/recommend/profile";
import { SEEN_ANSWERS, type RatedMovie, type SeenAnswer } from "@/lib/recommend/types";

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

// Whether a film lists on My films: everything watched and answered for,
// favourites included. "Not interested" (down), "Might watch someday" and
// watchlist films weren't seen, so they don't.
export const isInMyFilms = (movie: RatedMovie) =>
  movie.signal !== "down" && movie.signal !== "someday" && movie.signal !== "watchlist";

// A film's "Seen it" answer. A favourite carries its own in seenSignal.
export const answerOf = (movie: RatedMovie) => (movie.signal === "favorite" ? movie.seenSignal : movie.signal);

// What My films can show: everything, the favourites (ranked), or one
// "Seen it" answer.
export type MyFilmsFilter = "all" | "favorite" | SeenAnswer;
export const isMyFilmsFilter = (value: unknown): value is MyFilmsFilter =>
  value === "all" || value === "favorite" || SEEN_ANSWERS.includes(value as SeenAnswer);

// The films My films lists under a filter: favourites in rank order, anything
// else newest first (legacy "seen" rows show only under All). `movies` comes
// oldest first, as getUserMovies returns it.
export function filterMyFilms<T extends RatedMovie>(movies: T[], filter: MyFilmsFilter): T[] {
  if (filter === "favorite") return favoritesInOrder(movies);
  const seen = movies.filter(isInMyFilms).reverse();
  return filter === "all" ? seen : seen.filter((m) => answerOf(m) === filter);
}

// The watchlist, newest first. `movies` comes oldest first.
export const watchlistOf = <T extends RatedMovie>(movies: T[]): T[] =>
  movies.filter((m) => m.signal === "watchlist").reverse();
