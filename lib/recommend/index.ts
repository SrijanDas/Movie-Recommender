import "server-only";
import * as tmdb from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";
import { gatherCandidates } from "./candidates";
import { extractFeatures, isFeatureFilm } from "./features";
import { buildProfile, weighMovies } from "./profile";
import { genreTarget, rerank } from "./rerank";
import { scoreCandidate, type RatedVector } from "./score";
import { buildIdf, vectorize } from "./similarity";
import type { MovieSource } from "./source";
import type { RatedMovie, Recommendation } from "./types";

// One batch of the feed.
export const RESULT_COUNT = 20;
const FETCH_CONCURRENCY = 8; // the TMDB client caps in-flight requests too

const tmdbSource: MovieSource = {
  getMovie: tmdb.getMovie,
  getRelated: tmdb.getRelated,
  discover: tmdb.discover,
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const genreNames = (movie: TmdbMovieDetails) => (movie.genres ?? []).map((g) => g.name);

// The next batch of recommendations, best first. `skip` holds films the feed
// has already shown, so scrolling continues down the ranking instead of
// repeating it. `source` defaults to TMDB; scripts can pass their own.
export async function getRecommendations(
  rated: RatedMovie[],
  skip: Iterable<number> = [],
  source: MovieSource = tmdbSource,
): Promise<Recommendation[]> {
  // Fetch details, treating any failure as "unknown movie" so one bad id
  // can't break the page.
  const safeGetMovie = (id: number) => source.getMovie(id).catch(() => null);

  const weighted = weighMovies(rated).filter((m) => m.weight !== 0);
  if (!weighted.some((m) => m.weight > 0)) return [];

  const ratedDetails = await mapLimit(weighted, FETCH_CONCURRENCY, (m) => safeGetMovie(m.tmdbId));
  const ratedFilms = weighted.flatMap((m, i) => {
    const details = ratedDetails[i];
    return details
      ? [{ tmdbId: m.tmdbId, title: details.title, features: extractFeatures(details), weight: m.weight, genres: genreNames(details) }]
      : [];
  });
  const profile = buildProfile(ratedFilms);

  // Strongest first, so the top favourites' related lists are always pulled.
  const seeds = ratedFilms
    .filter((m) => m.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((m) => ({ tmdbId: m.tmdbId, weight: m.weight }));
  // Everything the user has touched — including "seen" — is never recommended.
  const exclude = new Set([...rated.map((m) => m.tmdbId), ...skip]);

  const candidateSet = await gatherCandidates(source, profile, seeds, exclude);
  const candidateDetails = await mapLimit(candidateSet.ids, FETCH_CONCURRENCY, safeGetMovie);
  const candidates = candidateDetails
    .filter((m): m is TmdbMovieDetails => m !== null && isFeatureFilm(m))
    .map((movie) => ({ movie, features: extractFeatures(movie) }));

  // Feature specificity is measured over the films in play.
  const idf = buildIdf([...ratedFilms.map((m) => m.features), ...candidates.map((c) => c.features)]);
  const ratedVectors: RatedVector[] = ratedFilms.map((m) => ({
    tmdbId: m.tmdbId,
    title: m.title,
    weight: m.weight,
    vector: vectorize(m.features, idf),
  }));

  const pool = candidates.map(({ movie, features }) => {
    const vector = vectorize(features, idf);
    const { score, anchors, reasons } = scoreCandidate(
      {
        tmdbId: movie.id,
        vector,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        listedBy: candidateSet.listedBy.get(movie.id) ?? new Map(),
      },
      ratedVectors,
      profile,
      idf,
    );
    return {
      score,
      vector,
      genres: genreNames(movie),
      collection: movie.belongs_to_collection?.id ?? null,
      recommendation: {
        tmdbId: movie.id,
        title: movie.title,
        year: releaseYear(movie.release_date),
        posterPath: movie.poster_path,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        score,
        because: anchors,
        reasons,
      } satisfies Recommendation,
    };
  });

  return rerank(pool, RESULT_COUNT, genreTarget(ratedFilms)).map((p) => p.recommendation);
}
