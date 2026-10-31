"use client";

import { SlidersHorizontalIcon, XIcon, type LucideIcon } from "lucide-react";
import { Fragment, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// One choice in a filter field.
export type FilterOption = {
  value: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
  iconClassName?: string;
  // Draws a line under this option, to set the ones before it apart.
  separatorAfter?: boolean;
};

// One filter inside the sheet: its label, then the current choice; tap it to
// pick another from a menu. Picking only changes the draft.
export function FilterField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value);
  const CurrentIcon = current?.icon;
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-body-sm font-semibold text-ink">
        {label}
      </span>
      <Select value={value} onValueChange={(next) => typeof next === "string" && onChange(next)}>
        <SelectTrigger
          aria-labelledby={id}
          className="h-11 w-full rounded-lg border-input bg-muted px-3 text-body-sm text-ink data-[size=default]:h-11 dark:bg-muted dark:hover:bg-muted"
        >
          <SelectValue>
            {() =>
              current && (
                <>
                  {CurrentIcon && <CurrentIcon className={cn("text-mute", current.iconClassName)} />}
                  <span className="truncate">{current.label}</span>
                </>
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="max-h-[min(22rem,var(--available-height))] bg-background p-1.5 ring-border">
          {options.flatMap(({ value: v, label: l, count, icon: Icon, iconClassName, separatorAfter }) => [
            <SelectItem key={v} value={v} className="h-10 gap-2.5 pr-9 pl-2 text-body-sm text-ink">
              {Icon && <Icon className={cn("text-mute", iconClassName)} />}
              <span className="flex-1 truncate">{l}</span>
              {count !== undefined && <span className="font-mono text-code text-mute tabular-nums">{count}</span>}
            </SelectItem>,
            ...(separatorAfter ? [<SelectSeparator key={`${v}-apart`} className="mx-0 my-1.5" />] : []),
          ])}
        </SelectContent>
      </Select>
    </div>
  );
}

// The Genre field: All genres, then each genre the films have, most common
// first, with counts.
export function GenreField({
  films,
  value,
  onChange,
}: {
  films: WithGenres[];
  value: string | null;
  onChange: (genre: string | null) => void;
}) {
  const genres = genreCounts(films);
  // Keep the chosen genre listed when none of these films have it, so it stays shown.
  if (value && !genres.some(([g]) => g === value)) genres.push([value, 0]);
  return (
    <FilterField
      label="Genre"
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? null : next)}
      options={[
        { value: ALL, label: "All genres", count: films.length, separatorAfter: true },
        ...genres.map(([genre, count]) => ({ value: genre, label: genre, count })),
      ]}
    />
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

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
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
      <GenreField films={films} value={draft} onChange={setDraft} />
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
