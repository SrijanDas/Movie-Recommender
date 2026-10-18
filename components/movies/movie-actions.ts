"use client";

import { toast } from "sonner";
import {
  addFavoriteMovie,
  addLikedMovie,
  addToWatchlist,
  rateRecommendation,
  removeMovie,
  undoRating as undoSavedRating,
  reorderFavorites as reorderSavedFavorites,
  setFavorites,
  type ActionResult,
} from "@/app/actions";
import type { UserMovie } from "@/lib/movies/types";

// Client wrappers around the Server Actions: each shows the error as a toast
// so callers only need to check `ok`.

function report(result: ActionResult): ActionResult {
  if (!result.ok) toast.error(result.error);
  return result;
}

// Onboarding: save these favourites, in this order (first = loved most).
export async function saveFavorites(picks: UserMovie[]): Promise<ActionResult> {
  return report(await setFavorites(picks.map((m) => m.tmdbId)));
}

// Put the favourites in this order; ids must be all of them.
export async function reorderFavorites(ids: number[]): Promise<ActionResult> {
  return report(await reorderSavedFavorites(ids));
}

// Make a film a favourite, at the bottom of the list.
export async function favoriteMovie(movie: UserMovie): Promise<ActionResult> {
  return report(await addFavoriteMovie(movie.tmdbId));
}

// Answers to "Seen it" on a recommendation. See components/movies/feedback.ts.
export type Feedback = "quit" | "no_rewatch" | "up" | "liked";
// Feedback, or the card's "Not interested", without having seen it.
export type Rating = Feedback | "down";

export async function rateMovie(movie: UserMovie & { signal: Rating }): Promise<ActionResult> {
  return report(await rateRecommendation(movie.tmdbId, movie.signal));
}

export async function watchLater(tmdbId: number): Promise<ActionResult> {
  return report(await addToWatchlist(tmdbId));
}

// Take back a rating or watchlist add made from a card, without refreshing.
export async function undoRating(tmdbId: number): Promise<ActionResult> {
  return report(await undoSavedRating(tmdbId));
}

export async function likeMovie(movie: UserMovie): Promise<ActionResult> {
  return report(await addLikedMovie(movie.tmdbId));
}

export async function forgetMovie(tmdbId: number): Promise<ActionResult> {
  return report(await removeMovie(tmdbId));
}
