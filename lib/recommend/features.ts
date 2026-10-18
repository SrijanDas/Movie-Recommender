import type { TmdbMovieDetails } from "@/lib/tmdb/types";
import type { Feature, MovieFeatures } from "./types";

// TMDB genre ids that define a movie's format.
const ANIMATION_GENRE = 16;
const DOCUMENTARY_GENRE = 99;
// The Academy's cut-off for a short film.
const SHORT_RUNTIME_MINUTES = 40;

const LEAD_BILLING = 2; // cast `order` 0–1
const SUPPORTING_BILLING = 8; // cast `order` 2–7
const MAX_KEYWORDS = 20;

// TMDB files TV movies, single episodes and specials under /movie too.
export const TV_MOVIE_GENRE = 10770;
// Episodes and specials run under an hour; feature films rarely do. TMDB also
// reports 0 for films it has no runtime for, usually unreleased or obscure ones.
export const MIN_FEATURE_RUNTIME = 60;

// Whether a movie is a feature film we'd recommend: not a TV movie, episode,
// special or short.
export function isFeatureFilm(movie: TmdbMovieDetails): boolean {
  return (
    !(movie.genres ?? []).some((g) => g.id === TV_MOVIE_GENRE) &&
    (movie.runtime ?? 0) >= MIN_FEATURE_RUNTIME
  );
}

const person = (id: number, name: string): Feature => ({ key: `p:${id}`, label: name });

export function extractFeatures(movie: TmdbMovieDetails): MovieFeatures {
  const cast = [...(movie.credits?.cast ?? [])].sort((a, b) => a.order - b.order);
  const crew = movie.credits?.crew ?? [];
  const genres = movie.genres ?? [];
  const genreIds = new Set(genres.map((g) => g.id));

  const format: Feature[] = [];
  if (genreIds.has(DOCUMENTARY_GENRE)) format.push({ key: "f:documentary", label: "Documentary" });
  else if (genreIds.has(ANIMATION_GENRE)) format.push({ key: "f:animated", label: "Animated" });
  else format.push({ key: "f:live-action", label: "Live action" });
  if (movie.runtime && movie.runtime < SHORT_RUNTIME_MINUTES) {
    format.push({ key: "f:short", label: "Short film" });
  }

  return {
    director: crew
      .filter((c) => c.job === "Director")
      .map((c) => person(c.id, c.name)),
    lead: cast.slice(0, LEAD_BILLING).map((c) => person(c.id, c.name)),
    supporting: cast
      .slice(LEAD_BILLING, SUPPORTING_BILLING)
      .map((c) => person(c.id, c.name)),
    genre: genres.map((g) => ({ key: `g:${g.id}`, label: g.name })),
    tone: (movie.keywords?.keywords ?? [])
      .slice(0, MAX_KEYWORDS)
      .map((k) => ({ key: `k:${k.id}`, label: k.name })),
    format,
  };
}

// Numeric TMDB id from a feature key ("p:525" → 525).
export function featureId(key: string): number {
  return Number(key.slice(key.indexOf(":") + 1));
}
