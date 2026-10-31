"use client";

import { SlidersHorizontalIcon, XIcon, type LucideIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

// Worth offering a genre filter: the films span two genres or more, or one is
// already chosen (so it can be cleared).
export const canFilterGenre = (films: WithGenres[], genre: string | null) =>
  genre !== null || genreCounts(films).length >= 2;

const filmCount = (n: number, noun: [string, string] = ["film", "films"]) => `${n} ${n === 1 ? noun[0] : noun[1]}`;

const chip =
  "h-9 gap-1.5 rounded-full border border-border bg-transparent px-3 text-body-sm font-normal text-body hover:bg-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-canvas aria-pressed:hover:bg-ink aria-pressed:hover:text-canvas";
const chipCount = "font-mono text-code text-mute tabular-nums group-aria-pressed/toggle:text-canvas/70";

// The genre chips inside a filter sheet: All, then each genre the films have,
// most common first, with counts. Tapping one only changes the draft.
export function GenreChoices({
  films,
  value,
  onChange,
}: {
  films: WithGenres[];
  value: string | null;
  onChange: (genre: string | null) => void;
}) {
  const genres = genreCounts(films);
  // Keep the chosen genre visible when none of these films have it, so it can be cleared.
  if (value && !genres.some(([g]) => g === value)) genres.push([value, 0]);
  return (
    <ToggleGroup
      aria-label="Genre"
      value={[value ?? ALL]}
      onValueChange={(next) => onChange(next[0] && next[0] !== ALL ? next[0] : null)}
      className="w-full flex-wrap gap-2"
    >
      <ToggleGroupItem value={ALL} className={chip}>
        All
        <span className={chipCount}>{films.length}</span>
      </ToggleGroupItem>
      {genres.map(([genre, n]) => (
        <ToggleGroupItem key={genre} value={genre} className={chip}>
          {genre}
          <span className={chipCount}>{n}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// One titled group of choices inside a filter sheet.
export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

// A Filter button that opens a sheet of choices (a bottom sheet on phones).
// Choices are a draft: nothing changes until Apply. Closing the sheet drops
// the draft, and opening it starts from what's applied (`onOpen` resets it).
// Reset clears the draft back to the defaults, still waiting for Apply.
export function FilterSheet({
  label,
  icon: Icon = SlidersHorizontalIcon,
  active,
  summary,
  resettable,
  onOpen,
  onReset,
  onApply,
  triggerClassName,
  children,
}: {
  // What the button says: the applied filter, or "Filter".
  label: string;
  icon?: LucideIcon;
  // Something other than the defaults is applied.
  active: boolean;
  // What Apply would show, e.g. "12 films".
  summary: string;
  // The draft differs from the defaults.
  resettable: boolean;
  onOpen: () => void;
  onReset: () => void;
  onApply: () => void;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        className={cn("relative h-9 max-w-full gap-1.5 px-3 text-body-sm", active && "border-ink/60 text-ink", triggerClassName)}
        aria-label={`Filter: ${label}`}
        onClick={() => {
          onOpen();
          setOpen(true);
        }}
      >
        <Icon />
        <span className="truncate">{label}</span>
        {active && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
      </Button>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none rounded-t-xl bg-background p-0 ring-1 ring-border max-sm:data-open:slide-in-from-bottom-10 max-sm:data-closed:slide-out-to-bottom-10 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(40rem,85dvh)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-col">
            <DialogTitle className="text-display-sm text-ink-strong">Filter</DialogTitle>
            <DialogDescription className="sr-only">Choose what to show, then tap Apply.</DialogDescription>
          </div>
          <DialogClose render={<Button variant="ghost" size="icon-lg" className="-mr-2 text-mute hover:text-ink" />}>
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {children}
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <p className="min-w-0 flex-1 text-body-sm text-body" aria-live="polite">
            {summary}
          </p>
          <Button variant="ghost" className="h-11 px-3 text-body-sm" disabled={!resettable} onClick={onReset}>
            Reset
          </Button>
          <Button
            className="h-11 px-5 text-body-sm font-semibold"
            onClick={() => {
              onApply();
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

// A Filter button whose sheet holds only the genre choices. `value` is the
// applied genre; `onChange` runs on Apply. Hidden when there's nothing to
// choose between.
export function GenreFilterButton({
  films,
  value,
  onChange,
  noun,
  className,
}: {
  films: WithGenres[];
  value: string | null;
  onChange: (genre: string | null) => void;
  noun?: [string, string];
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  if (!canFilterGenre(films, value)) return null;
  return (
    <FilterSheet
      label={value ?? "Filter"}
      active={value !== null}
      summary={filmCount(films.filter(inGenre(draft)).length, noun)}
      resettable={draft !== null}
      onOpen={() => setDraft(value)}
      onReset={() => setDraft(null)}
      onApply={() => onChange(draft)}
      triggerClassName={className}
    >
      <FilterSection title="Genre">
        <GenreChoices films={films} value={draft} onChange={setDraft} />
      </FilterSection>
    </FilterSheet>
  );
}

// A server-rendered list of films with a Filter button above it: each film's
// element comes rendered, with its genres, and the applied genre shows or
// hides it.
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
    <div className="flex flex-col gap-4">
      {canFilterGenre(films, genre) && (
        <div className="flex">
          <GenreFilterButton films={films} value={genre} onChange={setGenre} />
        </div>
      )}
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
