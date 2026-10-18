import "server-only";
import { cacheLife } from "next/cache";
import type {
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbPage,
  TmdbVideo,
} from "./types";

// TMDB's alternate API host. Some ISPs reset TLS connections to
// api.themoviedb.org by hostname; api.tmdb.org serves the same API.
const API_BASE = "https://api.tmdb.org/3";

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

export function isTmdbConfigured() {
  return Boolean(process.env.TMDB_API_TOKEN);
}

// At most this many TMDB requests in flight per server process, to stay well
// under TMDB's rate limit.
const MAX_IN_FLIGHT = 8;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    throw new TmdbError("TMDB_API_TOKEN is not set. Add it to .env.local.");
  }

  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  // Retry dropped connections, rate limits and server errors with backoff.
  for (let attempt = 0; ; attempt++) {
    const retry = attempt < MAX_RETRIES;
    let res: Response;
    try {
      res = await withSlot(() =>
        fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
      );
    } catch (error) {
      if (!retry) throw new TmdbError(`TMDB ${path} unreachable: ${String(error)}`);
      await sleep(attempt);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if (retry && (res.status === 429 || res.status >= 500)) {
      await sleep(attempt);
      continue;
    }
    throw new TmdbError(`TMDB ${path} failed with ${res.status}`, res.status);
  }
}

const MAX_RETRIES = 3;
const sleep = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt + Math.random() * 200));

export async function searchMovies(query: string): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdbFetch<TmdbPage<TmdbMovieSummary>>("/search/movie", {
    query,
    include_adult: "false",
  });
  return data.results;
}

// Films to pick favourites from: the most-voted films on TMDB, i.e. the ones
// most people have actually seen.
export async function getStarterMovies(): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("weeks");
  const pages = await Promise.all(
    [1, 2].map((page) =>
      tmdbFetch<TmdbPage<TmdbMovieSummary>>("/discover/movie", {
        sort_by: "vote_count.desc",
        include_adult: "false",
        page,
      }),
    ),
  );
  return pages.flatMap((p) => p.results).filter((m) => m.poster_path);
}

// Returns null for ids TMDB doesn't know (404), so one bad id can't break a page.
export async function getMovie(id: number): Promise<TmdbMovieDetails | null> {
  "use cache";
  cacheLife("weeks");
  try {
    return await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: "credits,keywords",
    });
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
}

// The film's YouTube trailer, official first, or null. Kept out of getMovie so
// the recommendation engine's ~100 detail calls stay small.
export async function getTrailerUrl(id: number): Promise<string | null> {
  "use cache";
  cacheLife("weeks");
  const { results } = await tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${id}/videos`);
  const youtube = results.filter((v) => v.site === "YouTube");
  const pick =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser");
  return pick ? `https://www.youtube.com/watch?v=${pick.key}` : null;
}

// TMDB's own "recommendations" plus "similar" lists for a movie.
export async function getRelated(id: number): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("weeks");
  const [recommended, similar] = await Promise.all([
    tmdbFetch<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/recommendations`),
    tmdbFetch<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/similar`),
  ]);
  return [...recommended.results, ...similar.results];
}

export type DiscoverParams = {
  // TMDB separators: "," means AND, "|" means OR.
  with_people?: string;
  with_genres?: string;
  with_keywords?: string;
};

export async function discover(params: DiscoverParams): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdbFetch<TmdbPage<TmdbMovieSummary>>("/discover/movie", {
    ...params,
    include_adult: "false",
    sort_by: "vote_average.desc",
    "vote_count.gte": 300,
  });
  return data.results;
}
