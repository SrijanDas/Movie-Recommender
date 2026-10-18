"use client";

import { CheckIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SearchResult } from "@/app/actions";
import { saveFavorites } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { Button } from "@/components/ui/button";
import { MAX_ONBOARDING_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

function Tile({
  movie,
  selected,
  onToggle,
  preload,
}: {
  movie: SearchResult;
  selected: boolean;
  onToggle: () => void;
  preload?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className="group flex w-full flex-col gap-1.5 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="relative block">
          <Poster
            path={movie.posterPath}
            title={movie.title}
            preload={preload}
            sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
            className={cn(
              "transition-[box-shadow,opacity] duration-150",
              selected ? "border-primary ring-2 ring-primary" : "group-hover:shadow-glow",
            )}
          />
          {selected && (
            <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground animate-in zoom-in-50 duration-150">
              <CheckIcon className="size-4" strokeWidth={3} aria-hidden />
            </span>
          )}
        </span>
        <span className="line-clamp-2 text-caption leading-tight text-body">
          {movie.title}
          {movie.year && <span className="text-mute"> · {movie.year}</span>}
        </span>
      </button>
    </li>
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
  const [picked, setPickedState] = useState<SearchResult[]>(saved);
  const setPicked = (update: (p: SearchResult[]) => SearchResult[]) => setPickedState(update(picked));
  const { query, setQuery, trimmed, active, results, loading } = useMovieSearch();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pickedIds = new Set(picked.map((m) => m.tmdbId));
  const remaining = Math.max(0, MIN_FAVORITES - picked.length);

  const toggle = (movie: SearchResult) => {
    if (pickedIds.has(movie.tmdbId)) {
      setPicked((p) => p.filter((m) => m.tmdbId !== movie.tmdbId));
    } else if (picked.length >= MAX_ONBOARDING_FAVORITES) {
      toast(`That’s ${MAX_ONBOARDING_FAVORITES}. Unpick one to swap it.`);
    } else {
      setPicked((p) => [...p, movie]);
    }
  };

  // Keep earlier picks visible (so they can be unpicked) ahead of the starters.
  const starterIds = new Set(starters.map((m) => m.tmdbId));
  const grid = active ? results : [...picked.filter((m) => !starterIds.has(m.tmdbId)), ...starters];

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
          Tap {MIN_FAVORITES} to {MAX_ONBOARDING_FAVORITES}, loved most first. We’ll match their directors, actors, genres
          and themes. You can add more any time in My films.
        </p>
      </div>

      <label className="flex h-11 items-center gap-3 rounded-lg border border-input bg-muted px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <SearchIcon className="size-5 shrink-0 text-mute" aria-hidden />
        <span className="sr-only">Search for a film</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a film"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-body-md text-ink outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Loader2Icon className="size-4 shrink-0 animate-spin text-mute" aria-label="Searching" />}
        {query && (
          <Button variant="ghost" size="icon-sm" aria-label="Clear search" onClick={() => setQuery("")}>
            <XIcon />
          </Button>
        )}
      </label>

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
                onToggle={() => toggle(movie)}
                preload={!active && i < 6}
              />
            ))}
          </ul>
        )}
      </section>

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
