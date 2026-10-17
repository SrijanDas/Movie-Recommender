import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMovies } from "@/lib/db/schema";
import { getMovie } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { RatedMovie } from "@/lib/recommend/types";
import type { MovieSnapshot, UserMovie } from "./types";

// A signed-in user's movie list in Postgres. Guests keep theirs in
// localStorage (lib/movies/local.ts). See docs/recommendations.md.
// Every function takes the verified user id; callers get it from
// getCurrentUserId() and must not pass anything else.

export type { MovieSnapshot, UserMovie } from "./types";

// Title/poster/year for a TMDB id, or null if TMDB doesn't know it.
export async function getSnapshot(tmdbId: number): Promise<MovieSnapshot | null> {
  const movie = await getMovie(tmdbId).catch(() => null);
  return movie
    ? { title: movie.title, posterPath: movie.poster_path, year: releaseYear(movie.release_date) }
    : null;
}

export async function getUserMovies(userId: string): Promise<UserMovie[]> {
  const rows = await db
    .select()
    .from(userMovies)
    .where(eq(userMovies.userId, userId))
    .orderBy(userMovies.createdAt);
  return rows.map((r) => ({
    tmdbId: r.tmdbId,
    signal: r.signal,
    title: r.title,
    posterPath: r.posterPath,
    year: r.year,
  }));
}

// Insert or overwrite. Callers must pass validated ids and snapshots.
export async function putMovies(userId: string, movies: UserMovie[]) {
  for (const m of movies) {
    await db
      .insert(userMovies)
      .values({ userId, ...m })
      .onConflictDoUpdate({
        target: [userMovies.userId, userMovies.tmdbId],
        set: { signal: m.signal, title: m.title, posterPath: m.posterPath, year: m.year },
      });
  }
}

export async function deleteMovies(userId: string, tmdbIds: number[]) {
  if (tmdbIds.length === 0) return;
  await db
    .delete(userMovies)
    .where(and(eq(userMovies.userId, userId), inArray(userMovies.tmdbId, tmdbIds)));
}

// Copy a guest's localStorage list into the account after sign-in.
// Rows already in the account win. Returns how many films were added.
export async function importMovies(userId: string, movies: RatedMovie[]): Promise<number> {
  const existing = await db
    .select({ tmdbId: userMovies.tmdbId })
    .from(userMovies)
    .where(eq(userMovies.userId, userId));
  const have = new Set(existing.map((r) => r.tmdbId));
  let added = 0;
  for (const m of movies) {
    if (have.has(m.tmdbId)) continue;
    // Re-derive display data server-side rather than trusting the browser.
    const snap = await getSnapshot(m.tmdbId);
    if (!snap) continue;
    await db
      .insert(userMovies)
      .values({ userId, tmdbId: m.tmdbId, signal: m.signal, ...snap })
      .onConflictDoNothing();
    added++;
  }
  return added;
}
