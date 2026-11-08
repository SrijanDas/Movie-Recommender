// Runs the recommendation engine outside Next against TMDB for a few
// hand-written tastes and prints each batch: the taste clusters it found,
// then every pick with its cluster, "Because you like …", reasons and
// affinity breakdown. Use it after changing any constant in lib/recommend.
//
//   bun --conditions=react-server scripts/recommend-preview.ts [taste…]
//
// Bun loads TMDB_API_TOKEN from .env.local. `--conditions=react-server` makes
// `server-only` resolve to its empty build. Plain fetch stands in for the
// cached TMDB client, which can't run outside Next (cacheLife throws).

import type { DiscoverParams } from "../lib/tmdb/client";
import type { TmdbMovieDetails, TmdbMovieSummary, TmdbPage } from "../lib/tmdb/types";
import { getRecommendations } from "../lib/recommend";
import type { MovieSource, RelatedMovies } from "../lib/recommend/source";
import type { RatedMovie, Signal } from "../lib/recommend/types";

const token = process.env.TMDB_API_TOKEN;
if (!token) throw new Error("TMDB_API_TOKEN is not set (see .env.local)");

let calls = 0;
async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  calls++;
  const url = new URL(`https://api.tmdb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

const source: MovieSource = {
  getMovie: (id) =>
    tmdb<TmdbMovieDetails>(`/movie/${id}`, { append_to_response: "credits,keywords" }).catch(() => null),
  getRelated: async (id, page = 1): Promise<RelatedMovies> => {
    const [r, s] = await Promise.all([
      tmdb<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/recommendations`, { page }),
      tmdb<TmdbPage<TmdbMovieSummary>>(`/movie/${id}/similar`, { page }),
    ]);
    return { recommendations: r.results, similar: s.results };
  },
  discover: async (params: DiscoverParams, page = 1) =>
    (
      await tmdb<TmdbPage<TmdbMovieSummary>>("/discover/movie", {
        sort_by: "vote_average.desc",
        ...params,
        page,
        include_adult: "false",
      })
    ).results,
};

// Favourites in rank order, then other answers. Ids are TMDB's.
const fav = (ids: number[]): RatedMovie[] => ids.map((tmdbId, rank) => ({ tmdbId, signal: "favorite", rank }));
const said = (signal: Signal, ids: number[], daysAgo = 0): RatedMovie[] =>
  ids.map((tmdbId) => ({ tmdbId, signal, ratedAt: new Date(Date.now() - daysAgo * 86_400_000) }));

const tastes: Record<string, RatedMovie[]> = {
  // Two tastes that have nothing in common: Pixar/Ghibli and Korean thrillers.
  eclectic: [
    ...fav([129, 862, 496243, 670, 11423]), // Spirited Away, Toy Story, Parasite, Oldboy, Memories of Murder
    ...said("peak", [8392, 1422]), // My Neighbor Totoro, The Departed
    ...said("liked", [10681, 1417]), // WALL·E, Pan's Labyrinth
  ],
  // 1970s New Hollywood, nothing recent.
  seventies: [
    ...fav([103, 592, 829, 238, 240]), // Taxi Driver, The Conversation, Chinatown, Godfather I, II
    ...said("peak", [1051]), // Kramer vs. Kramer
    ...said("quit", [299536, 335983]), // Infinity War, Venom
  ],
  // Blockbuster fan, three favourites, one dislike.
  popcorn: [
    ...fav([299534, 27205, 155]), // Endgame, Inception, The Dark Knight
    ...said("down", [346698]), // Barbie
  ],
  // Slow-burn horror; a dislike for jump-scare franchises.
  horror: [
    ...fav([493922, 419430, 1091, 138843]), // Hereditary, Get Out, The Thing, The Conjuring
    ...said("liked", [530385, 310131]), // Midsommar, The Witch
    ...said("quit", [396422], 400), // Annabelle: Creation, long ago
  ],
};

const wanted = process.argv.slice(2);
for (const [name, rated] of Object.entries(tastes)) {
  if (wanted.length && !wanted.includes(name)) continue;
  calls = 0;
  const started = Date.now();
  const recommendations = await getRecommendations(rated, [], source);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\n=== ${name} — ${recommendations.length} picks, ${calls} TMDB calls, ${seconds}s ===`);
  recommendations.forEach((r, i) => {
    const reasons = r.reasons.map((x) => x.text).join(" · ");
    console.log(
      `${String(i + 1).padStart(2)}. ${r.title} (${r.year}) ${r.score.toFixed(2)} ★${r.voteAverage.toFixed(1)} ${r.voteCount}v`,
    );
    console.log(`      because: ${r.because.join(", ") || "—"} | ${reasons}`);
  });
}
