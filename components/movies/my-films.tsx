"use client";

import {
  BookmarkPlusIcon,
  ChevronDownIcon,
  ClockIcon,
  ListIcon,
  Loader2Icon,
  PencilIcon,
  Share2Icon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import type { SearchResult } from "@/app/actions";
import { AddFilmsSheet } from "@/components/movies/add-films-sheet";
import {
  favoriteMovies,
  forgetMovie,
  rateMovie,
  watchLater,
  type Feedback,
} from "@/components/movies/movie-actions";
import { FilmRow, rankClass } from "@/components/movies/film-row";
import { SearchField } from "@/components/movies/search-field";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { answerOf, filterMyFilms, type ListedMovie, type MyFilmsFilter } from "@/lib/movies/types";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { MAX_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

type Filter = MyFilmsFilter;

// Removing a seen film undoes its answer, so ask first.
function ConfirmRemoveButton({ movie }: { movie: ListedMovie }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      const result = await forgetMovie(movie.tmdbId);
      if (result.ok) {
        setOpen(false);
        toast(`Removed ${movie.title}`);
      }
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-mute hover:text-ink"
        aria-label={`Remove ${movie.title}`}
        title="Remove"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
      </Button>
      <DialogContent showCloseButton={false} className="gap-5 bg-background p-5 ring-border">
        <div className="flex flex-col gap-2">
          <DialogTitle className="text-display-sm text-ink-strong">Remove {movie.title}?</DialogTitle>
          <DialogDescription className="text-body-sm text-body">
            {movie.signal === "favorite" && "It also leaves your favourites. "}
            Your answer for it stops shaping your recommendations, and it may be recommended again.
          </DialogDescription>
        </div>
        <DialogFooter className="-mx-5 -mb-5 flex-row gap-2 border-border bg-transparent px-5 pt-4 pb-5 sm:justify-end">
          <DialogClose render={<Button variant="outline" className="flex-1 sm:flex-none" />}>Cancel</DialogClose>
          <Button variant="destructive" className="flex-1 sm:flex-none" disabled={pending} onClick={remove}>
            {pending && <Loader2Icon className="animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Favourites, loved most first. Tap a row to open the film; ranking happens
// on its own page (/my-movies/favourites).
// While searching, `matches` narrows the list; each film keeps its real rank.
function FavoritesList({ favorites, matches }: { favorites: ListedMovie[]; matches: (m: ListedMovie) => boolean }) {
  if (favorites.length === 0) {
    return <p className="text-body-sm text-mute">Nothing yet. Tap Add to pick the films you love most.</p>;
  }
  const ranked = favorites.map((m, i) => ({ movie: m, rank: i + 1 })).filter(({ movie }) => matches(movie));
  if (ranked.length === 0) return null;
  return (
    <ol aria-label="Favourites, loved most first" className="divide-y divide-border border-y border-border">
      {ranked.map(({ movie, rank }) => (
        <FilmRow
          key={movie.tmdbId}
          movie={movie}
          lead={
            <span className={rankClass} aria-hidden>
              {rank}
            </span>
          }
        />
      ))}
    </ol>
  );
}

// A seen film: change how it was, make it a favourite, or remove it. The new
// answer shows at once; the refresh then moves it between the filters. A
// favourite shows a filled star; it leaves the favourites from their Edit page.
function SeenRow({ movie, favoritesFull }: { movie: ListedMovie; favoritesFull: boolean }) {
  const router = useRouter();
  const [rating, startRating] = useTransition();
  const [promoting, startPromoting] = useTransition();
  const isFavorite = movie.signal === "favorite";
  const [answer, setAnswer] = useOptimistic(answerOf(movie), (_, next: Feedback) => next);
  const current = ANSWERS.some((a) => a.feedback === answer) ? (answer as Feedback) : null;
  const rate = (feedback: Feedback) =>
    startRating(async () => {
      setAnswer(feedback);
      const result = await rateMovie({ ...movie, signal: feedback });
      if (!result.ok) return;
      toast(ANSWERS.find((a) => a.feedback === feedback)?.ack);
      router.refresh();
    });
  const promote = () => {
    if (isFavorite) {
      toast(`${movie.title} is one of your favourites`, {
        action: { label: "Edit", onClick: () => router.push("/my-movies/favourites") },
      });
      return;
    }
    if (favoritesFull) {
      toast(`You have ${MAX_FAVORITES} favourites. Remove one to add another.`);
      return;
    }
    startPromoting(async () => {
      const result = await favoriteMovies([movie.tmdbId]);
      if (result.ok) toast.success(`${movie.title} is now a favourite`);
    });
  };
  return (
    <FilmRow movie={movie}>
      <SeenItMenu title={movie.title} current={current} onRate={rate} variant="row" disabled={rating || promoting} />
      <Button
        variant="ghost"
        size="icon-lg"
        className={isFavorite ? "text-primary-soft" : "text-mute hover:text-primary-soft"}
        aria-label={isFavorite ? `${movie.title} is a favourite` : `Make ${movie.title} a favourite`}
        title={isFavorite ? "One of your favourites" : "Make a favourite"}
        disabled={rating || promoting}
        onClick={promote}
      >
        {promoting ? <Loader2Icon className="animate-spin" /> : <StarIcon className={isFavorite ? "fill-current" : undefined} />}
      </Button>
      <ConfirmRemoveButton movie={movie} />
    </FilmRow>
  );
}

// A film set aside as "Might watch someday": say how it was once watched
// (it moves to the seen films), save it to the watchlist, or take it off
// (it may be recommended again). Each moves it out of this filter.
function SomedayRow({ movie }: { movie: ListedMovie }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok: boolean }>, done: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return;
      toast(done);
      router.refresh();
    });
  return (
    <FilmRow movie={movie} className={cn(pending && "opacity-60")}>
      <SeenItMenu
        title={movie.title}
        onRate={(feedback) =>
          run(() => rateMovie({ ...movie, signal: feedback }), ANSWERS.find((a) => a.feedback === feedback)?.ack ?? "Saved")
        }
        variant="row"
        disabled={pending}
      />
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-mute hover:text-primary-soft"
        aria-label={`Move ${movie.title} to your watchlist`}
        title="Move to watchlist"
        disabled={pending}
        onClick={() => run(() => watchLater(movie.tmdbId), `${movie.title} is on your watchlist`)}
      >
        <BookmarkPlusIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-mute hover:text-ink"
        aria-label={`Remove ${movie.title}`}
        title="Remove"
        disabled={pending}
        onClick={() => run(() => forgetMovie(movie.tmdbId), `Removed ${movie.title}`)}
      >
        <Trash2Icon />
      </Button>
    </FilmRow>
  );
}

const filmsAdded = (n: number) => (n === 1 ? "Added 1 film" : `Added ${n} films`);

// All first (the default), then Someday, set apart from the rest since those
// films weren't seen, then each answer worst to best, then Favourites after
// Peak.
const FILTERS: { feedback: Filter; short: string; menu?: string; icon: typeof ListIcon }[] = [
  { feedback: "all", short: "All", icon: ListIcon },
  { feedback: "someday", short: "Someday", menu: "Might watch someday", icon: ClockIcon },
  ...ANSWERS,
  { feedback: "favorite", short: "Favourites", icon: StarIcon },
];

// The filter as the URL spells it (?show=), so a refresh keeps it.
export const showParam = (filter: Filter) => (filter === "favorite" ? "favourites" : filter);

// Case- and accent-insensitive, so "amelie" finds "Amélie".
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function MyFilms({
  movies,
  starters,
  initialFilter = "all",
  initialQuery = "",
}: {
  movies: ListedMovie[];
  starters: SearchResult[];
  // From the URL (?show= and ?q=), so a refresh or a shared link keeps them.
  initialFilter?: Filter;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  // Searches only this list, within the current filter.
  const [query, setQuery] = useState(initialQuery);
  // Mirror both into the URL without a navigation, so nothing reloads.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (filter === "all") params.delete("show");
    else params.set("show", showParam(filter));
    if (query.trim()) params.set("q", query);
    else params.delete("q");
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [filter, query]);
  const needle = fold(query.trim());
  const matches = (m: ListedMovie) => !needle || fold(m.title).includes(needle);

  const favorites = favoritesInOrder(movies);
  const favoriteIds = new Set(favorites.map((m) => m.tmdbId));
  const room = Math.max(0, MAX_FAVORITES - favorites.length);
  // Newest first (legacy "seen" rows show only under All).
  const seen = filterMyFilms(movies, "all");
  const someday = filterMyFilms(movies, "someday");
  const countOf = (f: Filter) =>
    f === "favorite"
      ? favorites.length
      : f === "all"
        ? seen.length
        : f === "someday"
          ? someday.length
          : seen.filter((m) => answerOf(m) === f).length;
  const inFilter = filter === "favorite" ? [] : filterMyFilms(movies, filter);
  const shown = inFilter.filter(matches);
  const onFavorites = filter === "favorite";
  const current = FILTERS.find((f) => f.feedback === filter) ?? FILTERS[0];
  const CurrentIcon = current.icon;
  const noMatch = <p className="text-body-sm text-mute">No films here match “{query.trim()}”.</p>;

  return (
    <div className={cn("flex flex-col gap-5 md:gap-6", onFavorites && favorites.length > 0 && "pb-16")}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">My films</h1>
        <p className="text-body-sm text-body md:text-body-md">
          {filter === "someday"
            ? "Films you’ve set aside for another time. They stay out of your picks."
            : !onFavorites
            ? "Everything that shapes your recommendations."
            : favorites.length < MIN_FAVORITES
              ? `Pick at least ${MIN_FAVORITES} favourites to unlock recommendations.`
              : room === 0
                ? `Loved most at the top. ${MAX_FAVORITES} is the most; remove one to add another.`
                : "Loved most at the top."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchField value={query} onChange={setQuery} placeholder="Search my films" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-11 max-w-[45%] shrink-0 gap-1.5 rounded-lg border-input bg-muted px-3 text-body-sm text-ink"
                  aria-label={`Show: ${current.short}`}
                />
              }
            >
              <CurrentIcon className={cn(filter === "favorite" && "text-primary-soft")} />
              <span className="truncate">{current.short}</span>
              <ChevronDownIcon className="text-mute" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-56 p-1.5">
              <DropdownMenuRadioGroup value={filter} onValueChange={(next: Filter) => setFilter(next)}>
                {FILTERS.flatMap(({ feedback, short, menu, icon: Icon }) => [
                  <DropdownMenuRadioItem
                    key={feedback}
                    value={feedback}
                    closeOnClick
                    className="h-10 gap-2.5 pr-9 pl-2 text-body-sm text-ink"
                  >
                    <Icon className={cn(feedback === "favorite" && "text-primary-soft")} />
                    <span className="flex-1">{menu ?? short}</span>
                    <span className="font-mono text-code text-mute">{countOf(feedback)}</span>
                  </DropdownMenuRadioItem>,
                  ...(feedback === "someday" ? [<DropdownMenuSeparator key="apart" className="my-1.5" />] : []),
                ])}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Share what's showing: the films under this filter, as a named list. */}
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-lg border-input bg-muted text-ink"
            render={<Link href={`/lists/new?from=my-films&filter=${filter}`} />}
            nativeButton={false}
            aria-label={`Share ${current.short === "All" ? "my films" : current.short} as a list`}
            title="Share as a list"
          >
            <Share2Icon />
          </Button>
        </div>

        {onFavorites ? (
          <>
            {room > 0 && (
              <div className="flex justify-end">
                <AddFilmsSheet
                  title="Add favourites"
                  description="Tap the films you love. They join the bottom of your list; you can move them up next."
                  starters={starters}
                  lockedReason={(m) => (favoriteIds.has(m.tmdbId) ? "Favourite" : null)}
                  max={room}
                  add={async (picks) => {
                    const result = await favoriteMovies(picks.map((m) => m.tmdbId));
                    if (result.ok) {
                      // New favourites land at the bottom; offer the shortcut to rank them.
                      toast.success(filmsAdded(picks.length), {
                        description: "Added at the bottom of your list.",
                        action: { label: "Rank them", onClick: () => router.push("/my-movies/favourites") },
                      });
                    }
                    return result.ok;
                  }}
                />
              </div>
            )}
            <FavoritesList favorites={favorites} matches={matches} />
            {needle && favorites.length > 0 && !favorites.some(matches) && noMatch}
            {favorites.length > 0 && (
              // Floats in thumb reach, just above the bottom tab bar on phones.
              <Button
                variant="outline"
                size="lg"
                className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 h-12 rounded-full border-border bg-background/95 px-5 text-body-sm font-semibold backdrop-blur-md sm:right-6 md:bottom-8"
                render={<Link href="/my-movies/favourites" />}
                nativeButton={false}
              >
                <PencilIcon />
                Edit
              </Button>
            )}
          </>
        ) : shown.length === 0 && inFilter.length > 0 ? (
          noMatch
        ) : shown.length === 0 ? (
          <p className="text-body-sm text-mute">
            {filter === "all"
              ? "Tap “Seen it” on a recommendation or search result and say how it was."
              : filter === "someday"
                ? "Nothing set aside yet. On a recommendation, tap ⋯ and pick “Might watch someday”."
              : `Nothing marked “${ANSWERS.find((a) => a.feedback === filter)?.label}” yet.`}
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {shown.map((m) =>
              filter === "someday" ? (
                <SomedayRow key={m.tmdbId} movie={m} />
              ) : (
                <SeenRow key={m.tmdbId} movie={m} favoritesFull={room === 0} />
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
