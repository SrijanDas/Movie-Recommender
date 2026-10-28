"use client";

import { Fragment, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

// A film with its genre names (from the cached film details). A film whose
// details couldn't load has none, and shows only under All.
type WithGenres = { genres?: string[] };

const ALL = "__all";

// Whether a film is in the chosen genre; null (All) keeps every film.
export const inGenre = (genre: string | null) => (film: WithGenres) =>
  !genre || (film.genres ?? []).includes(genre);

// The genres among `films`, most common first (ties A–Z), with how many films
// each has.
function genreCounts(films: WithGenres[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const film of films) for (const g of film.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
}

const chip =
  "h-9 shrink-0 snap-start gap-1.5 rounded-full border border-border bg-transparent px-3 text-body-sm font-normal text-body hover:bg-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-canvas aria-pressed:hover:bg-ink aria-pressed:hover:text-canvas";
const count = "font-mono text-code text-mute tabular-nums group-aria-pressed/toggle:text-canvas/70";

// One row of genre chips over a list of films: All, then each genre the films
// have, most common first. Tap one to show only those films; tap it again (or
// All) to show every film. Scrolls sideways on phones. Hidden when the films
// share fewer than two genres, since there'd be nothing to choose.
export function GenreFilter({
  films,
  value,
  onChange,
  className,
}: {
  films: WithGenres[];
  value: string | null;
  onChange: (genre: string | null) => void;
  className?: string;
}) {
  const genres = genreCounts(films);
  // Keep the chosen genre visible after its last film leaves, so it can be cleared.
  if (value && !genres.some(([g]) => g === value)) genres.push([value, 0]);
  if (genres.length < 2 && !value) return null;
  return (
    <ToggleGroup
      aria-label="Filter by genre"
      value={[value ?? ALL]}
      onValueChange={(next) => onChange(next[0] && next[0] !== ALL ? next[0] : null)}
      className={cn(
        "-mx-4 -my-1 w-auto snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6",
        className,
      )}
    >
      <ToggleGroupItem value={ALL} className={chip}>
        All
        <span className={count}>{films.length}</span>
      </ToggleGroupItem>
      {genres.map(([genre, n]) => (
        <ToggleGroupItem key={genre} value={genre} className={chip}>
          {genre}
          <span className={count}>{n}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// A server-rendered list of films with a genre filter above it: each film's
// element comes rendered, with its genres, and the filter shows or hides it.
export function GenreFilteredFilms({
  films,
  ordered = false,
  label,
  className,
}: {
  films: { tmdbId: number; genres?: string[]; node: React.ReactNode }[];
  ordered?: boolean;
  label: string;
  className?: string;
}) {
  const [genre, setGenre] = useState<string | null>(null);
  const shown = films.filter(inGenre(genre));
  const List = ordered ? "ol" : "ul";
  return (
    <div className="flex flex-col gap-5">
      <GenreFilter films={films} value={genre} onChange={setGenre} />
      {shown.length > 0 ? (
        <List aria-label={genre ? `${label}: ${genre}` : label} className={className}>
          {shown.map((f) => (
            <Fragment key={f.tmdbId}>{f.node}</Fragment>
          ))}
        </List>
      ) : (
        <p className="text-body-md text-body">No {genre} films here.</p>
      )}
    </div>
  );
}
