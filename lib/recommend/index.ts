import "server-only";
import { getMovie } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";
import { gatherCandidates } from "./candidates";
import { extractFeatures, isFeatureFilm } from "./features";
import { buildProfile, weighMovies } from "./profile";
import { scoreMovie } from "./score";
import type { RatedMovie, Recommendation } from "./types";

// One batch of the feed.
export const RESULT_COUNT = 20;
const FETCH_CONCURRENCY = 8; // the TMDB client caps in-flight requests too

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

// Fetch details, treating any failure as "unknown movie" so one bad id
// can't break the page.
const safeGetMovie = (id: number) => getMovie(id).catch(() => null);

// The next batch of recommendations, best first. `skip` holds films the feed
// has already shown, so scrolling continues down the ranking instead of
// repeating it.
export async function getRecommendations(
  rated: RatedMovie[],
  skip: Iterable<number> = [],
): Promise<Recommendation[]> {
  const weighted = weighMovies(rated).filter((m) => m.weight !== 0);
  if (!weighted.some((m) => m.weight > 0)) return [];

  const ratedDetails = await mapLimit(weighted, FETCH_CONCURRENCY, (m) => safeGetMovie(m.tmdbId));
  const profile = buildProfile(
    weighted.flatMap((m, i) => {
      const details = ratedDetails[i];
      return details
        ? [{ title: details.title, features: extractFeatures(details), weight: m.weight }]
        : [];
    }),
  );

  // Strongest first, so the top favourites' related lists are always pulled.
  const seeds = weighted
    .filter((m) => m.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((m) => m.tmdbId);
  // Everything the user has touched — including "seen" — is never recommended.
  const exclude = new Set([...rated.map((m) => m.tmdbId), ...skip]);

  const candidateIds = await gatherCandidates(profile, seeds, exclude);
  const candidates = await mapLimit(candidateIds, FETCH_CONCURRENCY, safeGetMovie);

  return candidates
    .filter((m): m is TmdbMovieDetails => m !== null && isFeatureFilm(m))
    .map((movie) => {
      const { score, reasons } = scoreMovie(
        {
          features: extractFeatures(movie),
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
        },
        profile,
      );
      return {
        tmdbId: movie.id,
        title: movie.title,
        year: releaseYear(movie.release_date),
        posterPath: movie.poster_path,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_COUNT);
}
