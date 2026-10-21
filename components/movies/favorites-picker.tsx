"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SearchResult } from "@/app/actions";
import { FilmRating } from "@/components/movies/film-meta";
import { saveFavorites } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { SearchField } from "@/components/movies/search-field";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { Button } from "@/components/ui/button";
import { MAX_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

function Tile({
  movie,
  selected,
  locked,
  onToggle,
  preload,
}: {
  movie: SearchResult;
  selected: boolean;
  // Why it can't be picked (already in the list), if it can't.
  locked?: string | null;
  onToggle: () => void;
  preload?: boolean;
}) {
  return (
    <li>
      {/* Gives under the thumb, so a tap lands before the tick appears. */}
      <motion.button
        type="button"
        whileTap={locked ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        aria-pressed={selected}
        disabled={!!locked}
        onClick={onToggle}
        className="group flex w-full flex-col gap-1.5 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <span className="relative block">
          <Poster
            path={movie.posterPath}
            title={movie.title}
            preload={preload}
            sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
            className={cn(
              "transition-[box-shadow,opacity] duration-150",
              locked ? "opacity-40" : selected ? "border-primary ring-2 ring-primary" : "group-hover:shadow-glow",
            )}
          />
          {locked && (
            <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-sm bg-background/90 px-1.5 py-1 text-caption-strong text-ink">
              <CheckIcon className="size-3" aria-hidden />
              {locked}
            </span>
          )}
          <AnimatePresence initial={false}>
            {selected && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.12 } }}
                transition={{ type: "spring", bounce: 0.35, duration: 0.3 }}
                className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <CheckIcon className="size-4" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 text-caption leading-tight text-body">{movie.title}</span>
          {(movie.year || !!movie.voteCount) && (
            <span className="flex items-center gap-1.5 font-mono text-caption text-mute">
              {movie.year}
              {movie.year && !!movie.voteCount && <span aria-hidden>·</span>}
              <FilmRating average={movie.voteAverage} count={movie.voteCount} />
            </span>
          )}
        </span>
      </motion.button>
    </li>
  );
}

// Search plus a tappable poster grid: popular films until you type, then
// results. Shared by onboarding and My films' "Add films" sheet.
export function FilmGrid({
  starters,
  picked,
  onToggle,
  lockedReason,
}: {
  starters: SearchResult[];
  picked: SearchResult[];
  onToggle: (movie: SearchResult) => void;
  lockedReason?: (movie: SearchResult) => string | null;
}) {
  const { query, setQuery, trimmed, active, results, loading } = useMovieSearch();
  const pickedIds = new Set(picked.map((m) => m.tmdbId));

  // Keep earlier picks visible (so they can be unpicked) ahead of the starters.
  const starterIds = new Set(starters.map((m) => m.tmdbId));
  const grid = active ? results : [...picked.filter((m) => !starterIds.has(m.tmdbId)), ...starters];

  return (
    <>
      <SearchField value={query} onChange={setQuery} loading={loading} />

      <section aria-label={active ? `Results for ${trimmed}` : "Popular and acclaimed films"} className="flex flex-col gap-3">
        <h2 className="text-body-sm font-semibold text-mute">
          {active ? `Results for “${trimmed}”` : "Popular and acclaimed"}
        </h2>
        {active && !loading && results.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">
            No films match “{trimmed}”. Try the original title or fewer words.
          </p>
        ) : !active && grid.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">
            We couldn’t load the film list right now. Search for a film instead.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-6">
            {grid.map((movie, i) => (
              <Tile
                key={movie.tmdbId}
                movie={movie}
                selected={pickedIds.has(movie.tmdbId)}
                locked={lockedReason?.(movie)}
                onToggle={() => onToggle(movie)}
                preload={!active && i < 6}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function FavoritesPicker({
  starters,
  saved,
}: {
  starters: SearchResult[];
  // Favourites already in the account, if any.
  saved: SearchResult[];
}) {
  const [picked, setPicked] = useState<SearchResult[]>(saved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remaining = Math.max(0, MIN_FAVORITES - picked.length);

  const toggle = (movie: SearchResult) => {
    if (picked.some((m) => m.tmdbId === movie.tmdbId)) {
      setPicked(picked.filter((m) => m.tmdbId !== movie.tmdbId));
    } else if (picked.length >= MAX_FAVORITES) {
      toast(`That’s ${MAX_FAVORITES}. Unpick one to swap it.`);
    } else {
      setPicked([...picked, movie]);
    }
  };

  const submit = () =>
    startTransition(async () => {
      const result = await saveFavorites(picked.map((m) => ({ ...m, signal: "favorite" })));
      // Replace, so Back never returns to onboarding.
      if (result.ok) router.replace("/recommendations");
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">Pick films you love</h1>
        <p className="text-body-md text-body">
          Tap {MIN_FAVORITES} to {MAX_FAVORITES}, loved most first. We’ll match their directors, actors, genres
          and themes. You can add more any time in My films.
        </p>
      </div>

      <FilmGrid starters={starters} picked={picked} onToggle={toggle} />

      {/* Sticky action bar: always in thumb reach on phones. */}
      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-body-sm text-body" aria-live="polite">
            {remaining > 0 ? (
              <>
                Pick <span className="font-semibold text-ink">{remaining} more</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{picked.length}</span> picked
              </>
            )}
          </p>
          <Button
            disabled={remaining > 0 || pending}
            onClick={submit}
            className="disabled:border-border disabled:bg-transparent disabled:text-mute disabled:opacity-100"
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Get recommendations
          </Button>
        </div>
      </div>
    </div>
  );
}
