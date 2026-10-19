import "server-only";
import { cacheLife } from "next/cache";
import type {
  TmdbImage,
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbPage,
  TmdbRegionProviders,
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
  return getMostVotedMovies(2);
}

// Search's "Popular and acclaimed" grid samples from this larger pool, so it
// rotates between visits.
export async function getPopularPool(): Promise<TmdbMovieSummary[]> {
  return getMostVotedMovies(5);
}

async function getMostVotedMovies(pageCount: number): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("weeks");
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => i + 1).map((page) =>
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

// A YouTube video on the film page: the trailer or an extra.
export type FilmVideo = { key: string; name: string; type: string };

// The film page's pictures and videos: its title logo, stills, trailer, and
// other clips. Kept out of getMovie so the recommendation engine's ~100
// detail calls stay small.
export type MovieMedia = {
  logo: TmdbImage | null;
  stills: TmdbImage[];
  trailer: FilmVideo | null;
  extras: FilmVideo[];
};

const STILLS_SHOWN = 12;
const EXTRAS_SHOWN = 8;
const EXTRA_TYPES = new Set(["Clip", "Featurette", "Behind the Scenes", "Teaser", "Bloopers"]);

const byVotes = (a: TmdbImage, b: TmdbImage) => b.vote_average - a.vote_average || b.vote_count - a.vote_count;

export async function getMovieMedia(id: number): Promise<MovieMedia> {
  "use cache";
  cacheLife("weeks");
  const [images, videos] = await Promise.all([
    // English logos, and stills with no text on them.
    tmdbFetch<{ backdrops: TmdbImage[]; logos: TmdbImage[] }>(`/movie/${id}/images`, {
      include_image_language: "en,null",
    }),
    tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${id}/videos`),
  ]);

  const logo = images.logos.filter((l) => l.iso_639_1 === "en").sort(byVotes)[0] ?? null;
  const stills = images.backdrops
    .filter((b) => b.iso_639_1 === null)
    .sort(byVotes)
    .slice(0, STILLS_SHOWN);

  const youtube = videos.results.filter((v) => v.site === "YouTube");
  const pick =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser");
  const extras = youtube
    .filter((v) => v !== pick && EXTRA_TYPES.has(v.type))
    .sort((a, b) => Number(b.official) - Number(a.official) || b.published_at.localeCompare(a.published_at))
    .slice(0, EXTRAS_SHOWN);

  const video = (v: TmdbVideo): FilmVideo => ({ key: v.key, name: v.name, type: v.type });
  return { logo, stills, trailer: pick ? video(pick) : null, extras: extras.map(video) };
}

// Where the film streams, rents and sells, by ISO 3166-1 country code. Data
// comes from JustWatch, which TMDB requires us to credit.
export async function getWatchProviders(id: number): Promise<Record<string, TmdbRegionProviders>> {
  "use cache";
  cacheLife("days");
  const { results } = await tmdbFetch<{ results: Record<string, TmdbRegionProviders> }>(
    `/movie/${id}/watch/providers`,
  );
  return results;
}

// TMDB's own "recommendations" plus "similar" lists for a movie, one page of
// each. A page past the end comes back empty.
export async function getRelated(id: number, page = 1): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("weeks");
  const [recommended, similar] = await Promise.all([
    tmdbFetch<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/recommendations`, { page }),
    tmdbFetch<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/similar`, { page }),
  ]);
  return [...recommended.results, ...similar.results];
}

export type DiscoverParams = {
  // TMDB separators: "," means AND, "|" means OR.
  with_people?: string;
  with_genres?: string;
  with_keywords?: string;
};

export async function discover(params: DiscoverParams, page = 1): Promise<TmdbMovieSummary[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdbFetch<TmdbPage<TmdbMovieSummary>>("/discover/movie", {
    ...params,
    page,
    include_adult: "false",
    sort_by: "vote_average.desc",
    "vote_count.gte": 300,
    // Feature films only: no TV movies (genre 10770), episodes or shorts.
    without_genres: 10770,
    "with_runtime.gte": 60,
  });
  return data.results;
}
