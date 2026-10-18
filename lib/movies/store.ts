import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMovies } from "@/lib/db/schema";
import { getMovie } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { MovieSnapshot, UserMovie } from "./types";

// The signed-in user's movie list in Postgres. See docs/recommendations.md.
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
    rank: r.rank,
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
      .values({ userId, ...m, rank: m.rank ?? null })
      .onConflictDoUpdate({
        target: [userMovies.userId, userMovies.tmdbId],
        set: { signal: m.signal, rank: m.rank ?? null, title: m.title, posterPath: m.posterPath, year: m.year },
      });
  }
}

// Put the user's favourites in this order. Callers must pass exactly the
// ids that are currently favourites.
export async function rankFavorites(userId: string, tmdbIds: number[]) {
  await db.transaction(async (tx) => {
    for (const [rank, tmdbId] of tmdbIds.entries()) {
      await tx
        .update(userMovies)
        .set({ rank })
        .where(and(eq(userMovies.userId, userId), eq(userMovies.tmdbId, tmdbId)));
    }
  });
}

export async function deleteMovies(userId: string, tmdbIds: number[]) {
  if (tmdbIds.length === 0) return;
  await db
    .delete(userMovies)
    .where(and(eq(userMovies.userId, userId), inArray(userMovies.tmdbId, tmdbIds)));
}
