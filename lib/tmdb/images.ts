// Safe to import from client components — no secrets here.

export type PosterSize = "w92" | "w185" | "w342" | "w500";

export function posterUrl(path: string | null, size: PosterSize = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function releaseYear(releaseDate: string | null | undefined) {
  const year = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : null;
}
