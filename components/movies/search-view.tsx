"use client";

import Link from "next/link";
import type { SearchResult } from "@/app/actions";
import { FilmRating } from "@/components/movies/film-meta";
import { Poster } from "@/components/movies/poster";
import { SearchField } from "@/components/movies/search-field";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { Skeleton } from "@/components/ui/skeleton";

const GRID = "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-6";
const SIZES = "(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw";

function Tile({ movie, preload }: { movie: SearchResult; preload?: boolean }) {
  return (
    <li>
      <Link
        href={`/movie/${movie.tmdbId}`}
        className="group flex flex-col gap-1.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Poster
          path={movie.posterPath}
          title={movie.title}
          preload={preload}
          sizes={SIZES}
          className="transition-shadow duration-150 group-hover:shadow-glow"
        />
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 text-caption leading-tight text-body group-hover:text-ink">{movie.title}</span>
          {(movie.year || !!movie.voteCount) && (
            <span className="flex items-center gap-1.5 font-mono text-caption text-mute">
              {movie.year}
              {movie.year && !!movie.voteCount && <span aria-hidden>·</span>}
              <FilmRating average={movie.voteAverage} count={movie.voteCount} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// Search any film and open its page. Popular films fill the grid until you
// type. The query lives in the URL (?q=), so Back from a film lands on the
// same results.
export function SearchView({
  starters,
  initial,
}: {
  starters: SearchResult[];
  initial: { query: string; results: SearchResult[] };
}) {
  const { query, setQuery, trimmed, active, results, loading } = useMovieSearch(initial);

  const search = (value: string) => {
    setQuery(value);
    const next = value.trim();
    window.history.replaceState(null, "", next ? `?q=${encodeURIComponent(next)}` : window.location.pathname);
  };

  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <SearchField value={query} onChange={search} loading={loading} autoFocus={!initial.query} size="lg" />
      </div>

      <section aria-label={active ? `Results for ${trimmed}` : "Popular and acclaimed films"} className="flex flex-col gap-3">
        <h2 className="text-body-sm font-semibold text-mute" aria-live="polite">
          {active ? `Results for “${trimmed}”` : "Popular and acclaimed"}
        </h2>
        {active && loading ? (
          <ul className={GRID} aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <Skeleton className="aspect-2/3 rounded-xl" />
                <Skeleton className="h-3 w-3/4" />
              </li>
            ))}
          </ul>
        ) : active && results.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">
            No films match “{trimmed}”. Try the original title or fewer words.
          </p>
        ) : !active && starters.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">Type a title to find any film.</p>
        ) : (
          <ul className={GRID}>
            {(active ? results : starters).map((movie, i) => (
              <Tile key={movie.tmdbId} movie={movie} preload={i < 6} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
