import "server-only";
import * as tmdb from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";
import { AffinityModel, languageName, metaOf, type FilmMeta } from "./affinity";
import { gatherCandidates, type ClusterQuery } from "./candidates";
import { clusterFilms } from "./clusters";
import { extractFeatures, featureId } from "./features";
import { buildProfile, topFeatures, weighMovies } from "./profile";
import { genreTarget, rerank } from "./rerank";
import { scoreCandidate, type Candidate, type RatedVector } from "./score";
import { buildIdf, vectorize } from "./similarity";
import type { MovieSource } from "./source";
import type { MovieFeatures, RatedMovie, Recommendation } from "./types";

// One batch of the feed.
export const RESULT_COUNT = 20;
const FETCH_CONCURRENCY = 8; // the TMDB client caps in-flight requests too

// A cluster's discover query narrows to a language holding more than this
// share of it, and to its era when its 10th–90th percentile years span less
// than ERA_WINDOW_MAX_YEARS (padded by ERA_WINDOW_PAD each side).
const LANGUAGE_DOMINANCE = 0.6;
const ERA_WINDOW_MAX_YEARS = 30;
const ERA_WINDOW_PAD = 5;
// Affinity reasons fire only when the user's taste is this concentrated.
const LANGUAGE_REASON_SHARE = 0.5;
const ERA_REASON_FIT = 0.8;
const ERA_REASON_SPREAD = 12;

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

type RatedFilm = {
  tmdbId: number;
  title: string;
  weight: number;
  features: MovieFeatures;
  genres: string[];
  meta: FilmMeta;
};

// What one taste cluster asks discover for, from its members.
function clusterQuery(members: RatedFilm[], share: number): ClusterQuery {
  const profile = buildProfile(members);
  const ids = (features: { key: string }[]) => features.map((f) => featureId(f.key));
  const affinity = new AffinityModel(members);
  const window = affinity.yearWindow();
  const narrow = window && window[1] - window[0] < ERA_WINDOW_MAX_YEARS;
  return {
    share,
    directors: ids(topFeatures(profile, "director", 2)),
    leads: ids(topFeatures(profile, "lead", 3)),
    genre: ids(topFeatures(profile, "genre", 1))[0] ?? null,
    keywords: ids(topFeatures(profile, "tone", 4)),
    language: affinity.dominantLanguage(LANGUAGE_DOMINANCE),
    years: narrow ? [window[0] - ERA_WINDOW_PAD, window[1] + ERA_WINDOW_PAD] : null,
    medianLogVotes: affinity.medianLogVotes(),
  };
}

// The next batch of recommendations, best first. `skip` holds films the feed
// has already shown, so scrolling continues down the ranking instead of
// repeating it. `source` defaults to TMDB; scripts can pass their own. `now`
// dates the answers for time decay.
export async function getRecommendations(
  rated: RatedMovie[],
  skip: Iterable<number> = [],
  source: MovieSource = tmdbSource,
  now = new Date(),
): Promise<Recommendation[]> {
  // Fetch details, treating any failure as "unknown movie" so one bad id
  // can't break the page.
  const safeGetMovie = (id: number) => source.getMovie(id).catch(() => null);

  const weighted = weighMovies(rated, now).filter((m) => m.weight !== 0);
  if (!weighted.some((m) => m.weight > 0)) return [];

  const ratedDetails = await mapLimit(weighted, FETCH_CONCURRENCY, (m) => safeGetMovie(m.tmdbId));
  const ratedFilms: RatedFilm[] = weighted.flatMap((m, i) => {
    const details = ratedDetails[i];
    return details
      ? [
          {
            tmdbId: m.tmdbId,
            title: details.title,
            weight: m.weight,
            features: extractFeatures(details),
            genres: genreNames(details),
            meta: metaOf(details),
          },
        ]
      : [];
  });
  const profile = buildProfile(ratedFilms);
  const liked = ratedFilms.filter((m) => m.weight > 0);

  // Tastes: cluster the liked films on their own IDF (relative, so it needs
  // no candidates), then give each cluster a retrieval budget by share.
  const ratedIdf = buildIdf(ratedFilms.map((m) => m.features));
  const clusters = clusterFilms(ratedFilms.map((m) => ({ weight: m.weight, vector: vectorize(m.features, ratedIdf) })));
  const clusterOf = new Map<number, number>();
  clusters.forEach((c, k) => c.members.forEach((i) => clusterOf.set(ratedFilms[i].tmdbId, k)));
  const queries = clusters.map((c) => clusterQuery(c.members.map((i) => ratedFilms[i]), c.share));
  const affinity = new AffinityModel(liked);

  // Strongest first, so the top favourites' lists are always walked.
  const byWeight = (a: RatedFilm, b: RatedFilm) => Math.abs(b.weight) - Math.abs(a.weight);
  const seed = (m: RatedFilm) => ({ tmdbId: m.tmdbId, weight: m.weight });
  const seeds = liked.sort(byWeight).map(seed);
  const negativeSeeds = ratedFilms.filter((m) => m.weight < 0).sort(byWeight).map(seed);
  // Everything the user has touched — including "seen" — is never recommended.
  const exclude = new Set([...rated.map((m) => m.tmdbId), ...skip]);

  const candidateSet = await gatherCandidates(source, queries, seeds, negativeSeeds, exclude);
  const candidateDetails = await mapLimit(candidateSet.ids, FETCH_CONCURRENCY, safeGetMovie);
  const candidates = candidateDetails
    .filter((m): m is TmdbMovieDetails => m !== null)
    .map((movie) => ({ movie, features: extractFeatures(movie) }));
  const maxVisit = Math.max(...candidateSet.visits.values(), 0);

  // Feature specificity is measured over the films in play.
  const idf = buildIdf([...ratedFilms.map((m) => m.features), ...candidates.map((c) => c.features)]);
  const ratedVectors: RatedVector[] = ratedFilms.map((m) => ({
    tmdbId: m.tmdbId,
    title: m.title,
    weight: m.weight,
    vector: vectorize(m.features, idf),
    cluster: clusterOf.get(m.tmdbId) ?? -1,
  }));

  const yearSpread = affinity.yearSpread();
  const affinityReasons = (meta: FilmMeta): Candidate["affinityReasons"] => {
    const reasons: Candidate["affinityReasons"] = [];
    if (meta.language && meta.language !== "en" && affinity.languageShare(meta.language) >= LANGUAGE_REASON_SHARE) {
      reasons.push({ dimension: "language", text: `In ${languageName(meta.language)}` });
    }
    if (meta.year !== null && yearSpread < ERA_REASON_SPREAD && affinity.eraFit(meta.year) >= ERA_REASON_FIT) {
      reasons.push({ dimension: "era", text: `${Math.floor(meta.year / 10) * 10}s` });
    }
    return reasons;
  };

  const pool = candidates.map(({ movie, features }) => {
    const vector = vectorize(features, idf);
    const meta = metaOf(movie);
    const { score, cluster, anchors, reasons } = scoreCandidate(
      {
        tmdbId: movie.id,
        vector,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        listedBy: candidateSet.listedBy.get(movie.id) ?? new Map(),
        affinity: affinity.scores(meta),
        support: maxVisit > 0 ? (candidateSet.visits.get(movie.id) ?? 0) / maxVisit : 0,
        affinityReasons: affinityReasons(meta),
      },
      ratedVectors,
      clusters.length,
      profile,
      idf,
    );
    return {
      score,
      vector,
      cluster,
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
        genres: genreNames(movie),
        score,
        because: anchors,
        reasons,
      } satisfies Recommendation,
    };
  });

  const clusterTarget = new Map(clusters.map((c, k) => [k, c.share]));
  return rerank(pool, RESULT_COUNT, genreTarget(ratedFilms), clusterTarget).map((p) => p.recommendation);
}
