"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  addLikedMovie,
  rateRecommendation,
  removeMovie,
  setFavorites,
  type ActionResult,
} from "@/app/actions";
import { putLocalMovies, readLocalMovies, removeLocalMovies, type LocalResult } from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT, type UserMovie } from "@/lib/movies/types";

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

export async function saveFavorites(signedIn: boolean, picks: UserMovie[]): Promise<ActionResult> {
  if (signedIn) return report(await setFavorites(picks.map((m) => m.tmdbId)));
  const chosen = new Set(picks.map((m) => m.tmdbId));
  const unpicked = readLocalMovies()
    .filter((m) => m.signal === "favorite" && !chosen.has(m.tmdbId))
    .map((m) => m.tmdbId);
  return fromLocal(putLocalMovies(picks, { removeIds: unpicked }));
}

export async function rateMovie(
  signedIn: boolean,
  movie: UserMovie & { signal: "up" | "down" | "seen" },
): Promise<ActionResult> {
  if (signedIn) return report(await rateRecommendation(movie.tmdbId, movie.signal));
  return fromLocal(putLocalMovies([movie]));
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
