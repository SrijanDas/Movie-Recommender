// Safe to import from client components — no secrets here.

export type PosterSize = "w92" | "w185" | "w342" | "w500";

export function posterUrl(path: string | null, size: PosterSize = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

// Headshots for cast and crew. w185 stays sharp in a 48px circle on 2x screens.
export function profileUrl(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

// Streaming-service logos (square). w92 stays sharp at 32px on 3x screens.
export function logoUrl(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w92${path}` : null;
}

export function releaseYear(releaseDate: string | null | undefined) {
  const year = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : null;
}
