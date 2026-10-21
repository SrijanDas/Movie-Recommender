// Where the engine gets movie data. The app passes the TMDB client; a script
// can pass anything with the same shape, so the engine runs outside Next.

import type { DiscoverParams } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbMovieSummary } from "@/lib/tmdb/types";

export type RelatedMovies = {
  // TMDB's "recommendations": built from TMDB users' behaviour.
  recommendations: TmdbMovieSummary[];
  // TMDB's "similar": genre and keyword overlap only.
  similar: TmdbMovieSummary[];
};

export type MovieSource = {
  getMovie(id: number): Promise<TmdbMovieDetails | null>;
  getRelated(id: number, page?: number): Promise<RelatedMovies>;
  discover(params: DiscoverParams, page?: number): Promise<TmdbMovieSummary[]>;
};
