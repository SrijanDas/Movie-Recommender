"use client";

import { useRouter } from "@bprogress/next/app";
import { MovieSearch } from "@/components/movies/movie-search";

// Search any film and open its page, where it can be marked seen or saved
// to the watchlist.
export function FilmSearch() {
  const router = useRouter();
  return (
    <MovieSearch
      size="md"
      label="Search for any film"
      placeholder="Search for any film"
      onPick={(movie) => router.push(`/movie/${movie.tmdbId}`)}
    />
  );
}
