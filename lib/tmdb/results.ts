import type { SearchResult } from "@/app/actions";
import { posterUrl, releaseYear } from "./images";
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

// What a shared film or series link says: in the share sheet's message, and
// as the preview's description in chats and social apps. `blurb` is the
// tagline or overview; only its first sentence is used.
export function shareMessage(title: string, when: string | number | null, blurb: string) {
  const line = blurb.trim().split(/(?<=[.!?])\s+/)[0];
  return `You should watch ${title}${when ? ` (${when})` : ""}.${line ? ` ${line}` : ""}`;
}

// Link-preview tags: the poster as the image, so chats show the film itself.
export function previewMetadata(path: string, title: string, description: string, posterPath: string | null) {
  const type = path.startsWith("/series/") ? ("video.tv_show" as const) : ("video.movie" as const);
  const image = posterPath && { url: posterUrl(posterPath, "w500")!, width: 500, height: 750, alt: `Poster for ${title}` };
  return {
    title,
    description,
    openGraph: { title, description, url: path, type, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image" as const, title, description, images: image ? [image.url] : undefined },
  };
}
