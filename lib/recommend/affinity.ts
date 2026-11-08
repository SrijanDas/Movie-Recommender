// The half of taste that isn't cast and crew: when a film was made, in what
// language, how widely it's been seen, and how long it runs. Pure.
//
// Each is a weighted kernel density over the user's liked films, read at the
// candidate's value and scaled so the user's peak is 1. Popularity as a
// *taste* replaces a global popularity bonus (which pushes everyone toward the
// canon); runtime as a taste replaces the old hard "feature films only" rule.

import type { TmdbMovieDetails } from "@/lib/tmdb/types";
import { releaseYear } from "@/lib/tmdb/images";

// Kernel widths. Tune here.
const ERA_SIGMA_YEARS = 8;
const POPULARITY_SIGMA_LOG10 = 0.5; // ×3 either way in vote count
const RUNTIME_SIGMA_LOG10 = 0.12; // about ±30 % in minutes
// A language the user has never liked still scores this much.
const LANGUAGE_FLOOR = 0.3;
// With no data, or a candidate missing the value, a component is neutral.
const NEUTRAL = 0.5;

export type FilmMeta = {
  year: number | null;
  language: string | null; // ISO 639-1
  voteCount: number;
  runtime: number | null; // minutes
};

export function metaOf(movie: TmdbMovieDetails): FilmMeta {
  return {
    year: releaseYear(movie.release_date),
    language: movie.original_language || null,
    voteCount: movie.vote_count ?? 0,
    runtime: movie.runtime || null,
  };
}

export type AffinityScores = {
  era: number;
  language: number;
  popularity: number;
  runtime: number;
  mean: number;
};

type Kernel = {
  // (value, weight) sample points.
  points: [number, number][];
  sigma: number;
  // Density at the best-covered sample point, so scores top out at 1.
  peak: number;
};

function kernel(points: [number, number][], sigma: number): Kernel | null {
  if (points.length === 0) return null;
  const k = { points, sigma, peak: 0 };
  for (const [x] of points) k.peak = Math.max(k.peak, density(k, x));
  return k.peak > 0 ? k : null;
}

function density(k: Kernel, x: number): number {
  let sum = 0;
  for (const [value, weight] of k.points) {
    const z = (x - value) / k.sigma;
    sum += weight * Math.exp(-0.5 * z * z);
  }
  return sum;
}

const read = (k: Kernel | null, x: number | null) =>
  k && x !== null ? Math.min(1, density(k, x) / k.peak) : NEUTRAL;

const log10 = (x: number) => Math.log10(1 + x);

export class AffinityModel {
  private readonly era: Kernel | null;
  private readonly popularity: Kernel | null;
  private readonly runtime: Kernel | null;
  private readonly languages = new Map<string, number>(); // code → share
  private readonly years: number[];

  constructor(films: { weight: number; meta: FilmMeta }[]) {
    const liked = films.filter((f) => f.weight > 0);
    const total = liked.reduce((sum, f) => sum + f.weight, 0);
    const points = (pick: (m: FilmMeta) => number | null): [number, number][] =>
      liked.flatMap((f) => {
        const x = pick(f.meta);
        return x === null ? [] : [[x, f.weight]];
      });
    this.era = kernel(points((m) => m.year), ERA_SIGMA_YEARS);
    this.popularity = kernel(points((m) => log10(m.voteCount)), POPULARITY_SIGMA_LOG10);
    this.runtime = kernel(points((m) => (m.runtime ? Math.log10(m.runtime) : null)), RUNTIME_SIGMA_LOG10);
    for (const f of liked) {
      if (f.meta.language) this.languages.set(f.meta.language, (this.languages.get(f.meta.language) ?? 0) + f.weight / total);
    }
    this.years = points((m) => m.year).map(([y]) => y);
  }

  scores(meta: FilmMeta): AffinityScores {
    const era = read(this.era, meta.year);
    const popularity = read(this.popularity, log10(meta.voteCount));
    const runtime = read(this.runtime, meta.runtime ? Math.log10(meta.runtime) : null);
    let language = NEUTRAL;
    if (this.languages.size && meta.language) {
      const max = Math.max(...this.languages.values());
      language = LANGUAGE_FLOOR + (1 - LANGUAGE_FLOOR) * ((this.languages.get(meta.language) ?? 0) / max);
    }
    return { era, language, popularity, runtime, mean: (era + language + popularity + runtime) / 4 };
  }

  // Share of the user's liked weight in this language, 0–1.
  languageShare(code: string | null): number {
    return code ? (this.languages.get(code) ?? 0) : 0;
  }

  // The language holding more than `min` of the weight, if any.
  dominantLanguage(min: number): string | null {
    for (const [code, share] of this.languages) if (share > min) return code;
    return null;
  }

  // How well the candidate's year sits in the user's era, 0–1.
  eraFit(year: number | null): number {
    return read(this.era, year);
  }

  // Standard deviation of liked films' release years; Infinity with no data.
  yearSpread(): number {
    if (this.years.length < 2) return Infinity;
    const mean = this.years.reduce((a, b) => a + b, 0) / this.years.length;
    return Math.sqrt(this.years.reduce((sum, y) => sum + (y - mean) ** 2, 0) / this.years.length);
  }

  // The 10th–90th percentile of liked years, or null with no data.
  yearWindow(): [number, number] | null {
    if (this.years.length === 0) return null;
    const sorted = [...this.years].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return [at(0.1), at(0.9)];
  }

  // Median log10 vote count of liked films, or null with no data.
  medianLogVotes(): number | null {
    const values = this.popularity?.points.map(([x]) => x).sort((a, b) => a - b);
    return values?.length ? values[Math.floor(values.length / 2)] : null;
  }
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

// "ko" → "Korean"; the code itself if unknown.
export function languageName(code: string): string {
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return code;
  }
}
