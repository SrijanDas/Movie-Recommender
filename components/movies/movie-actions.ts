"use client";

import { toast } from "sonner";
import {
  addFavoriteMovies,
  addLikedMovies,
  addToWatchlist,
  rateRecommendation,
  removeFavorite,
  removeMovie,
  undoRating as undoSavedRating,
  saveFavoritesEdit as saveSavedFavoritesEdit,
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

// Keep these favourites, in this order; any left out are removed.
export async function saveFavoritesEdit(ids: number[]): Promise<ActionResult> {
  return report(await saveSavedFavoritesEdit(ids));
}

// Make films favourites, appended in this order to the bottom of the list.
export async function favoriteMovies(ids: number[]): Promise<ActionResult> {
  return report(await addFavoriteMovies(ids));
}

export async function unfavoriteMovie(tmdbId: number): Promise<ActionResult> {
  return report(await removeFavorite(tmdbId));
}

// Answers to "Seen it" on a recommendation. See components/movies/feedback.ts.
export type Feedback = "quit" | "no_rewatch" | "okay" | "up" | "liked" | "peak";
// Feedback, or the card menu's "Not interested" / "Might watch someday",
// without having seen it.
export type Rating = Feedback | "down" | "someday";

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

// Mark films as seen and liked.
export async function likeMovies(ids: number[]): Promise<ActionResult> {
  return report(await addLikedMovies(ids));
}

export async function forgetMovie(tmdbId: number): Promise<ActionResult> {
  return report(await removeMovie(tmdbId));
}
