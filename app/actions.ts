"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteMovies,
  getSnapshot,
  getUserMovies,
  importMovies,
  putMovies,
  rankFavorites,
  type UserMovie,
} from "@/lib/movies/store";
import { GUEST_MOVIE_LIMIT } from "@/lib/movies/types";
import { getRecommendations } from "@/lib/recommend";
import {
  MAX_FAVORITES,
  MIN_FAVORITES,
  SIGNALS,
  type RatedMovie,
  type Recommendation,
  type Signal,
} from "@/lib/recommend/types";
import { searchMovies } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

// Mutations here are for signed-in users and write to Postgres. Guests write
// to localStorage in the browser (lib/movies/local.ts) instead.

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SearchResult = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

const SIGN_IN_REQUIRED: ActionResult = { ok: false, error: "Sign in to save to your account." };

const isTmdbId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isSignal = (value: unknown): value is Signal =>
  typeof value === "string" && (SIGNALS as readonly string[]).includes(value);

const isRank = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MAX_FAVORITES;

// Parse an untrusted list of { tmdbId, signal, rank? } from the browser.
function parseRated(list: unknown, max: number): RatedMovie[] | null {
  if (!Array.isArray(list) || list.length > max) return null;
  const rated: RatedMovie[] = [];
  for (const m of list) {
    if (!m || !isTmdbId(m.tmdbId) || !isSignal(m.signal)) return null;
    rated.push({ tmdbId: m.tmdbId, signal: m.signal, rank: m.signal === "favorite" && isRank(m.rank) ? m.rank : null });
  }
  return rated;
}

// A list of distinct TMDB ids, at most MAX_FAVORITES long.
const isIdList = (ids: unknown): ids is number[] =>
  Array.isArray(ids) && ids.length <= MAX_FAVORITES && ids.every(isTmdbId) && new Set(ids).size === ids.length;

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
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Recommendations for a guest, whose list lives in their browser.
export async function recommendFor(
  list: unknown,
): Promise<{ ok: true; recommendations: Recommendation[] } | { ok: false; error: string }> {
  const rated = parseRated(list, GUEST_MOVIE_LIMIT);
  if (!rated) return { ok: false, error: "That list doesn't look right. Try picking your films again." };
  try {
    return { ok: true, recommendations: await getRecommendations(rated) };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "We couldn't reach the movie database. Try again in a moment." };
  }
}

// After sign-in: move the guest's localStorage list into the account.
export async function importLocalMovies(list: unknown): Promise<ActionResult & { added?: number }> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  const rated = parseRated(list, GUEST_MOVIE_LIMIT);
  if (!rated) return { ok: false, error: "Couldn't read the films saved on this device." };
  try {
    const added = await importMovies(userId, rated);
    revalidatePath("/", "layout");
    return { ok: true, added };
  } catch (error) {
    return failure(error);
  }
}

// Replace the favourites picked on the home screen, in the order picked
// (first = loved most). Favourites that were unpicked are removed; other
// signals (likes, feedback) are left alone.
export async function setFavorites(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids) || ids.length < MIN_FAVORITES) {
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
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Put the user's favourites in this order: the ids must be exactly their
// current favourites. Position feeds the recommendation weights.
export async function reorderFavorites(ids: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isIdList(ids)) return { ok: false, error: "That order doesn't look right." };
  try {
    const current = await getUserMovies(userId);
    const favorites = new Set(current.filter((m) => m.signal === "favorite").map((m) => m.tmdbId));
    if (ids.length !== favorites.size || !ids.every((id) => favorites.has(id))) {
      return { ok: false, error: "Your favourites changed. Reload and try again." };
    }
    await rankFavorites(userId, ids);
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Make a film a favourite, at the bottom of the list. It may already be in
// the list under another signal (from "Seen it") or be new.
export async function addFavoriteMovie(id: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id)) return { ok: false, error: "Unknown movie." };
  try {
    const current = await getUserMovies(userId);
    const favorites = current.filter((m) => m.signal === "favorite");
    if (favorites.some((m) => m.tmdbId === id)) return { ok: true };
    if (favorites.length >= MAX_FAVORITES) {
      return { ok: false, error: `You can have ${MAX_FAVORITES} favourites. Remove one to make room.` };
    }
    const snapshot = await getSnapshot(id);
    if (!snapshot) return { ok: false, error: "That movie couldn't be found." };
    const rank = favorites.reduce((max, m) => Math.max(max, m.rank ?? -1), -1) + 1;
    await putMovies(userId, [{ tmdbId: id, signal: "favorite", rank, ...snapshot }]);
    return done();
  } catch (error) {
    return failure(error);
  }
}

export async function addLikedMovie(id: unknown): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isTmdbId(id)) return { ok: false, error: "Unknown movie." };
  try {
    const current = await getUserMovies(userId);
    if (current.some((m) => m.tmdbId === id && m.signal === "favorite")) return { ok: true };
    const snapshot = await getSnapshot(id);
    if (!snapshot) return { ok: false, error: "That movie couldn't be found." };
    await putMovies(userId, [{ tmdbId: id, signal: "liked", ...snapshot }]);
    return done();
  } catch (error) {
    return failure(error);
  }
}

// Answers to "Seen it" (see components/movies/feedback.ts), plus "down" from
// a recommendation card's "Not interested".
const FEEDBACK = ["quit", "no_rewatch", "up", "liked", "down"] as const;
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
