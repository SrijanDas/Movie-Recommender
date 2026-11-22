import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSeries } from "@/lib/db/schema";
import type { ListedMovie, MovieSnapshot } from "@/lib/movies/types";
import type { Signal } from "@/lib/recommend/types";
import { getSeries } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

// The signed-in user's saved and rated series. See docs/series.md. Every
// function takes the verified user id from getCurrentUserId().

// Series genres that bundle two film genres, split so one genre Filter finds
// both kinds. Series-only genres ("Reality", "Kids"…) keep their own name.
const AS_FILM_GENRES: Record<string, string[]> = {
  "Action & Adventure": ["Action", "Adventure"],
  "Sci-Fi & Fantasy": ["Science Fiction", "Fantasy"],
  "War & Politics": ["War"],
};

export async function getSeriesSnapshot(seriesId: number): Promise<MovieSnapshot | null> {
  const series = await getSeries(seriesId).catch(() => null);
  return series ? { title: series.name, posterPath: series.poster_path, year: releaseYear(series.first_air_date) } : null;
}

export async function getSeriesSignal(userId: string, seriesId: number): Promise<Signal | null> {
  const [row] = await db
    .select({ signal: userSeries.signal })
    .from(userSeries)
    .where(and(eq(userSeries.userId, userId), eq(userSeries.seriesId, seriesId)));
  return row?.signal ?? null;
}

export async function putSeries(userId: string, seriesId: number, signal: Signal, snapshot: MovieSnapshot) {
  const row = { signal, ...snapshot };
  await db
    .insert(userSeries)
    .values({ userId, seriesId, ...row })
    .onConflictDoUpdate({ target: [userSeries.userId, userSeries.seriesId], set: row });
}

export async function deleteSeries(userId: string, seriesId: number) {
  await db.delete(userSeries).where(and(eq(userSeries.userId, userId), eq(userSeries.seriesId, seriesId)));
}

// Watchlist series, newest first, shaped like watchlist films (with score
// and genres) and marked `kind: "series"`.
export async function getWatchlistSeries(userId: string): Promise<ListedMovie[]> {
  const rows = await db
    .select()
    .from(userSeries)
    .where(and(eq(userSeries.userId, userId), eq(userSeries.signal, "watchlist")))
    .orderBy(desc(userSeries.updatedAt));
  const details = await Promise.all(rows.map((r) => getSeries(r.seriesId).catch(() => null)));
  return rows.map((r, i) => {
    const d = details[i];
    return {
      kind: "series",
      tmdbId: r.seriesId,
      signal: r.signal,
      ratedAt: r.updatedAt,
      title: r.title,
      posterPath: r.posterPath,
      year: r.year,
      ...(d && {
        voteAverage: d.vote_average,
        voteCount: d.vote_count,
        genres: [...new Set(d.genres.flatMap((g) => AS_FILM_GENRES[g.name] ?? [g.name]))],
      }),
    };
  });
}
