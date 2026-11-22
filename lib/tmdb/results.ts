import type { SearchResult } from "@/app/actions";
import { releaseYear } from "./images";
import type { TmdbMovieSummary, TmdbSeriesSummary } from "./types";

type Listed = (TmdbMovieSummary & { media_type: "movie" }) | (TmdbSeriesSummary & { media_type: "tv" });

// A film or series from a TMDB list, as a tile.
export function toResult(r: Listed): SearchResult {
  const base = { tmdbId: r.id, posterPath: r.poster_path, voteAverage: r.vote_average, voteCount: r.vote_count };
  return r.media_type === "tv"
    ? { ...base, kind: "series", title: r.name, year: releaseYear(r.first_air_date) }
    : { ...base, kind: "movie", title: r.title, year: releaseYear(r.release_date) };
}

export const movieResult = (m: TmdbMovieSummary) => toResult({ ...m, media_type: "movie" });
export const seriesResult = (s: TmdbSeriesSummary) => toResult({ ...s, media_type: "tv" });
