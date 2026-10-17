"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Loader2Icon, SearchIcon } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { SearchResult } from "@/app/actions";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { CommandItem, CommandList } from "@/components/ui/command";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

// Type-ahead TMDB search. Results open under the field; Enter or click picks.
// `disabledReason` lets the caller grey out movies already chosen.
export function MovieSearch({
  onPick,
  disabledReason,
  placeholder = "Search for a film",
  label,
  autoFocus,
  size = "lg",
}: {
  onPick: (movie: SearchResult) => void;
  disabledReason?: (movie: SearchResult) => string | null;
  placeholder?: string;
  label: string;
  autoFocus?: boolean;
  size?: "lg" | "md";
}) {
  const { query, setQuery, trimmed: q, active, results, loading } = useMovieSearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const search = (value: string) => {
    setQuery(value);
    setOpen(true);
  };

  const pick = (movie: SearchResult) => {
    onPick(movie);
    setQuery("");
    inputRef.current?.focus();
  };

  const showList = open && active;

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      label={label}
      className="relative w-full"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-input bg-muted px-4 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          size === "lg" ? "h-14" : "h-11",
        )}
      >
        <SearchIcon className="size-5 shrink-0 text-mute" aria-hidden />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={search}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          aria-labelledby={labelId}
          autoFocus={autoFocus}
          className={cn(
            "h-full w-full bg-transparent text-ink outline-none placeholder:text-mute",
            size === "lg" ? "text-body-lg" : "text-body-md",
          )}
        />
        {loading && <Loader2Icon className="size-4 shrink-0 animate-spin text-mute" aria-label="Searching" />}
      </div>

      {showList && (
        <CommandList
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-96 rounded-xl border border-border bg-popover p-1 shadow-modal"
          // Keep the input focused when clicking a result.
          onMouseDown={(e) => e.preventDefault()}
        >
          {!loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-body-sm text-mute">
              No films match “{q}”. Try the original title or fewer words.
            </p>
          )}
          {results.map((movie) => {
            const reason = disabledReason?.(movie) ?? null;
            const thumb = posterUrl(movie.posterPath, "w92");
            return (
              <CommandItem
                key={movie.tmdbId}
                value={String(movie.tmdbId)}
                disabled={reason !== null}
                onSelect={() => pick(movie)}
                className="gap-3 rounded-lg px-2 py-2"
              >
                <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
                  {thumb && <Image src={thumb} alt="" fill sizes="32px" unoptimized className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-ink">{movie.title}</span>
                  <span className="block font-mono text-caption text-mute">{movie.year ?? "—"}</span>
                </span>
                {reason && <span className="text-caption text-mute">{reason}</span>}
              </CommandItem>
            );
          })}
        </CommandList>
      )}
    </CommandPrimitive>
  );
}
