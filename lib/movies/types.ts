// Shared shapes for a user's movie list. Pure — safe on server and client.

import { favoritesInOrder } from "@/lib/recommend/profile";
import { SEEN_ANSWERS, type RatedMovie, type SeenAnswer } from "@/lib/recommend/types";

export type MovieSnapshot = {
  title: string;
  posterPath: string | null;
  year: number | null;
};

// Watching progress, on watchlist rows only: `startedAt` is set when the
// user taps a watch option on the film page, `startedVia` names it, and
// `nudgedAt` is when they last told the check-in "Still watching".
export type WatchProgress = {
  startedAt?: Date | null;
  startedVia?: string | null;
  nudgedAt?: Date | null;
};

export type UserMovie = RatedMovie & MovieSnapshot & WatchProgress;

// A watchlist film the user has started: it lists first on the watchlist,
// and the app asks how it went (lib/watch/check-in.ts).
export const isWatching = (movie: RatedMovie & WatchProgress) => movie.signal === "watchlist" && !!movie.startedAt;

// TMDB's audience score and the film's genre names. Not stored (scores
// drift): pages add them from the cached TMDB details with withDetails()
// before showing a list.
export type TmdbScore = { voteAverage: number; voteCount: number };
export type ListedMovie = UserMovie & Partial<TmdbScore> & { genres?: string[] };

// Whether a film lists on My films: everything watched and answered for,
// favourites included. "Not interested" (down), "Might watch someday" and
// watchlist films weren't seen, so they don't.
export const isInMyFilms = (movie: RatedMovie) =>
  movie.signal !== "down" && movie.signal !== "someday" && movie.signal !== "watchlist";

// A film's "Seen it" answer. A favourite carries its own in seenSignal.
export const answerOf = (movie: RatedMovie) => (movie.signal === "favorite" ? movie.seenSignal : movie.signal);

// What My films can show: everything seen, the favourites (ranked), one
// "Seen it" answer, or the films set aside as "Might watch someday" (not
// seen, so never under All).
export type MyFilmsFilter = "all" | "favorite" | "someday" | SeenAnswer;
export const isMyFilmsFilter = (value: unknown): value is MyFilmsFilter =>
  value === "all" || value === "favorite" || value === "someday" || SEEN_ANSWERS.includes(value as SeenAnswer);

// The films My films lists under a filter: favourites in rank order, anything
// else newest first (legacy "seen" rows show only under All). `movies` comes
// oldest first, as getUserMovies returns it.
export function filterMyFilms<T extends RatedMovie>(movies: T[], filter: MyFilmsFilter): T[] {
  if (filter === "favorite") return favoritesInOrder(movies);
  if (filter === "someday") return movies.filter((m) => m.signal === "someday").reverse();
  const seen = movies.filter(isInMyFilms).reverse();
  return filter === "all" ? seen : seen.filter((m) => answerOf(m) === filter);
}

// The watchlist: films being watched first (latest started first), then
// the rest newest first. `movies` comes oldest first.
export const watchlistOf = <T extends RatedMovie & WatchProgress>(movies: T[]): T[] => {
  const saved = movies.filter((m) => m.signal === "watchlist").reverse();
  const watching = saved.filter(isWatching).sort((a, b) => b.startedAt!.getTime() - a.startedAt!.getTime());
  return [...watching, ...saved.filter((m) => !isWatching(m))];
};
