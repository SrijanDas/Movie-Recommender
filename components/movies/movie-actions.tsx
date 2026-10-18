"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  addFavoriteMovie,
  addLikedMovie,
  rateRecommendation,
  removeMovie,
  undoRating as undoSavedRating,
  reorderFavorites as reorderSavedFavorites,
  setFavorites,
  type ActionResult,
} from "@/app/actions";
import {
  putLocalMovies,
  readLocalMovies,
  removeLocalMovies,
  reorderLocalFavorites,
  type LocalResult,
} from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT, type UserMovie } from "@/lib/movies/types";
import { MAX_FAVORITES } from "@/lib/recommend/types";

// One place that decides where a change goes: Postgres via Server Actions
// when signed in, this browser's localStorage when not.

export function promptSignIn(message: string) {
  toast(message, {
    description: "Sign in to save more films and sync them to all your devices.",
    action: (
      <Link href="/sign-in" className="ml-auto shrink-0 rounded-lg bg-primary px-3 py-1.5 text-body-sm font-semibold text-primary-foreground">
        Sign in
      </Link>
    ),
    duration: 8000,
  });
}

function fromLocal(result: LocalResult): ActionResult {
  if (result.ok) return result;
  if (result.reason === "limit") {
    promptSignIn(`This device holds up to ${GUEST_MOVIE_LIMIT} films.`);
    return { ok: false, error: "limit" };
  }
  toast.error("Your browser blocked saving. Sign in to keep your films.");
  return { ok: false, error: "storage" };
}

function report(result: ActionResult): ActionResult {
  if (!result.ok) toast.error(result.error);
  return result;
}

// Replace the favourites with these, in this order (first = loved most).
export async function saveFavorites(signedIn: boolean, picks: UserMovie[]): Promise<ActionResult> {
  if (signedIn) return report(await setFavorites(picks.map((m) => m.tmdbId)));
  const chosen = new Set(picks.map((m) => m.tmdbId));
  const unpicked = readLocalMovies()
    .filter((m) => m.signal === "favorite" && !chosen.has(m.tmdbId))
    .map((m) => m.tmdbId);
  const ranked = picks.map((m, rank) => ({ ...m, signal: "favorite" as const, rank }));
  return fromLocal(putLocalMovies(ranked, { removeIds: unpicked }));
}

// Put the favourites in this order; ids must be all of them.
export async function reorderFavorites(signedIn: boolean, ids: number[]): Promise<ActionResult> {
  if (signedIn) return report(await reorderSavedFavorites(ids));
  return fromLocal(reorderLocalFavorites(ids));
}

// Make a film a favourite, at the bottom of the list. Refuses when the
// list is full so the caller can say so.
export async function favoriteMovie(signedIn: boolean, movie: UserMovie): Promise<ActionResult> {
  if (signedIn) return report(await addFavoriteMovie(movie.tmdbId));
  const favorites = readLocalMovies().filter((m) => m.signal === "favorite");
  if (favorites.some((m) => m.tmdbId === movie.tmdbId)) return { ok: true };
  if (favorites.length >= MAX_FAVORITES) {
    const error = `You can have ${MAX_FAVORITES} favourites. Remove one to make room.`;
    toast.error(error);
    return { ok: false, error };
  }
  const rank = favorites.reduce((max, m) => Math.max(max, m.rank ?? -1), -1) + 1;
  return fromLocal(putLocalMovies([{ ...movie, signal: "favorite", rank }]));
}

// Answers to "Seen it" on a recommendation. See components/movies/feedback.ts.
export type Feedback = "quit" | "no_rewatch" | "up" | "liked";
// Feedback, or the card's "Not interested", without having seen it.
export type Rating = Feedback | "down";

export async function rateMovie(
  signedIn: boolean,
  movie: UserMovie & { signal: Rating },
): Promise<ActionResult> {
  if (signedIn) return report(await rateRecommendation(movie.tmdbId, movie.signal));
  return fromLocal(putLocalMovies([movie]));
}

// Take back a rating made from a recommendation, without refreshing the page.
export async function undoRating(signedIn: boolean, tmdbId: number): Promise<ActionResult> {
  if (signedIn) return report(await undoSavedRating(tmdbId));
  removeLocalMovies([tmdbId]);
  return { ok: true };
}

export async function likeMovie(signedIn: boolean, movie: UserMovie): Promise<ActionResult> {
  if (signedIn) return report(await addLikedMovie(movie.tmdbId));
  if (readLocalMovies().some((m) => m.tmdbId === movie.tmdbId && m.signal === "favorite")) return { ok: true };
  return fromLocal(putLocalMovies([{ ...movie, signal: "liked" }]));
}

export async function forgetMovie(signedIn: boolean, tmdbId: number): Promise<ActionResult> {
  if (signedIn) return report(await removeMovie(tmdbId));
  removeLocalMovies([tmdbId]);
  return { ok: true };
}
