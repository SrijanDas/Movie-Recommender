"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteMovies,
  getSnapshot,
  getUserMovies,
  putMovies,
  rankFavorites,
  type UserMovie,
} from "@/lib/movies/store";
import { markOnboarded } from "@/lib/onboarding";
import { MAX_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";
import { searchMovies } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

// Every mutation is for the signed-in user and writes to Postgres.

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SearchResult = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  // TMDB's score; missing for films taken from the user's own list.
  voteAverage?: number;
  voteCount?: number;
};

const SIGN_IN_REQUIRED: ActionResult = { ok: false, error: "Your session ended. Sign in again." };

const isTmdbId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

// A list of distinct TMDB ids.
const isIdList = (ids: unknown): ids is number[] =>
  Array.isArray(ids) && ids.every(isTmdbId) && new Set(ids).size === ids.length;

// Postgres foreign_key_violation: the session's user isn't in auth.users.
const isMissingUser = (error: unknown) =>
  error instanceof Error && (error.cause as { code?: string } | undefined)?.code === "23503";

async function failure(error: unknown): Promise<ActionResult> {
  console.error(error);
  // getClaims() checks the JWT locally, so a deleted account keeps a valid-
  // looking session until it expires. Drop it so the user can sign in again.
  if (isMissingUser(error)) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    revalidatePath("/", "layout");
    return { ok: false, error: "Your account wasn't found. Sign in again." };
  }
  return { ok: false, error: "Something went wrong talking to the movie database. Try again." };
}

function done(): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function searchMoviesAction(query: unknown): Promise<SearchResult[]> {
  if (typeof query !== "string") return [];
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return [];
  try {
    const results = await searchMovies(q);
    return results.slice(0, 12).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      year: releaseYear(m.release_date),
      posterPath: m.poster_path,
      voteAverage: m.vote_average,
      voteCount: m.vote_count,
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Onboarding: save the favourites picked, in the order picked (first =
// loved most), and mark onboarding done. Favourites that were unpicked are
// removed; other signals (likes, feedback) are left alone.
export async function setFavorites(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids) || ids.length < MIN_FAVORITES || ids.length > MAX_FAVORITES) {
    return { ok: false, error: `Pick between ${MIN_FAVORITES} and ${MAX_FAVORITES} different films.` };
  }

  try {
    const snapshots = await Promise.all(ids.map(getSnapshot));
    if (snapshots.some((s) => s === null)) {
      return { ok: false, error: "One of those films couldn't be found." };
    }

    const chosen = new Set(ids);
    const current = await getUserMovies(userId);
    const unpicked = current
      .filter((m) => m.signal === "favorite" && !chosen.has(m.tmdbId))
      .map((m) => m.tmdbId);
    const favorites: UserMovie[] = ids.map((tmdbId, i) => ({
      tmdbId,
      signal: "favorite",
      rank: i,
      ...snapshots[i]!,
    }));

    await deleteMovies(userId, unpicked);
    await putMovies(userId, favorites);
    await markOnboarded(userId);
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Save an edit of the favourites list: `ids` are the favourites to keep, in
// order (first = loved most); any favourite left out is removed.
export async function saveFavoritesEdit(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids)) return { ok: false, error: "That order doesn't look right." };
  try {
    const current = await getUserMovies(userId);
    const favorites = current.filter((m) => m.signal === "favorite").map((m) => m.tmdbId);
    const kept = new Set(ids);
    if (!ids.every((id) => favorites.includes(id))) {
      return { ok: false, error: "Your favourites changed. Reload and try again." };
    }
    await rankFavorites(
      userId,
      ids,
      favorites.filter((id) => !kept.has(id)),
    );
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Make these films favourites, appended in this order to the bottom of the
// list, up to MAX_FAVORITES in all. Each may already be in the list under
// another signal (from "Seen it") or be new.
export async function addFavoriteMovies(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids) || ids.length === 0) return { ok: false, error: "Unknown movie." };
  try {
    const favorites = (await getUserMovies(userId)).filter((m) => m.signal === "favorite");
    const fresh = ids.filter((id) => !favorites.some((m) => m.tmdbId === id));
    if (favorites.length + fresh.length > MAX_FAVORITES) {
      return { ok: false, error: `You can have ${MAX_FAVORITES} favourites. Remove one to add another.` };
    }
    const snapshots = await Promise.all(fresh.map(getSnapshot));
    if (snapshots.some((s) => !s)) return { ok: false, error: "A movie couldn't be found." };
    const next = favorites.reduce((max, m) => Math.max(max, m.rank ?? -1), -1) + 1;
    await putMovies(
      userId,
      fresh.map((tmdbId, i) => ({ tmdbId, signal: "favorite", rank: next + i, ...snapshots[i]! })),
    );
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Mark these films as seen and liked. Favourites stay favourites.
export async function addLikedMovies(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids) || ids.length === 0) return { ok: false, error: "Unknown movie." };
  try {
    const current = await getUserMovies(userId);
    const fresh = ids.filter((id) => !current.some((m) => m.tmdbId === id && m.signal === "favorite"));
    const snapshots = await Promise.all(fresh.map(getSnapshot));
    if (snapshots.some((s) => !s)) return { ok: false, error: "A movie couldn't be found." };
    await putMovies(
      userId,
      fresh.map((tmdbId, i) => ({ tmdbId, signal: "liked", ...snapshots[i]! })),
    );
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Answers to "Seen it" (see components/movies/feedback.ts), plus "down" and
// "someday" from a recommendation card's menu ("Not interested", "Might watch
// someday").
const FEEDBACK = ["quit", "no_rewatch", "up", "liked", "peak", "down", "someday"] as const;
type Feedback = (typeof FEEDBACK)[number];

export async function rateRecommendation(id: unknown, feedback: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id) || !FEEDBACK.includes(feedback as Feedback)) {
    return { ok: false, error: "Invalid feedback." };
  }
  try {
    const snapshot = await getSnapshot(id);
    if (!snapshot) return { ok: false, error: "That movie couldn't be found." };
    await putMovies(userId, [{ tmdbId: id, signal: feedback as Feedback, ...snapshot }]);
    // No revalidation: the recommendations page removes just this card and
    // recomputes only when the user taps Refresh.
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// Save a film to watch later. Never overwrites a film already in the list
// (a favourite or a "Seen it" answer); like ratings, it doesn't revalidate.
export async function addToWatchlist(id: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id)) return { ok: false, error: "Unknown movie." };
  try {
    const existing = (await getUserMovies(userId)).find((m) => m.tmdbId === id);
    if (existing) {
      return existing.signal === "watchlist" ? { ok: true } : { ok: false, error: "That film is already in My films." };
    }
    const snapshot = await getSnapshot(id);
    if (!snapshot) return { ok: false, error: "That movie couldn't be found." };
    await putMovies(userId, [{ tmdbId: id, signal: "watchlist", ...snapshot }]);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// Undo a rating made on a recommendation card. Like rateRecommendation, it
// leaves the page alone; the card comes back on the client.
export async function undoRating(id: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id)) return { ok: false, error: "Unknown movie." };
  try {
    await deleteMovies(userId, [id]);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMovie(id: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id)) return { ok: false, error: "Unknown movie." };
  try {
    await deleteMovies(userId, [id]);
    return done();
  } catch (error) {
    return failure(error);
  }
}
