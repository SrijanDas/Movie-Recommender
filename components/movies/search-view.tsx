"use client";

import { searchTitlesAction, type SearchResult } from "@/app/actions";
import { SearchField } from "@/components/movies/search-field";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { TILE_GRID as GRID, TitleTile, titleHref } from "@/components/movies/title-tile";
import { Skeleton } from "@/components/ui/skeleton";

// Search any film or series and open its page. Popular titles fill the grid until you
// type. The query lives in the URL (?q=), so Back from a film lands on the
// same results.
export function SearchView({
  starters,
  initial,
}: {
  starters: SearchResult[];
  initial: { query: string; results: SearchResult[] };
}) {
  const { query, setQuery, trimmed, active, loading, results } = useMovieSearch(initial, searchTitlesAction);

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

      <section aria-label={active ? `Results for ${trimmed}` : "Popular and acclaimed"} className="flex flex-col gap-3">
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
            Nothing matches “{trimmed}”. Try the original title or fewer words.
          </p>
        ) : !active && starters.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">Type a title to find any film or series.</p>
        ) : (
          <ul className={GRID}>
            {(active ? results : starters).map((movie, i) => (
              <TitleTile key={titleHref(movie)} title={movie} preload={i < 6} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
