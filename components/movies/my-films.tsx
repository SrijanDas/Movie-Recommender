"use client";

import { Loader2Icon, PencilIcon, StarIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import type { SearchResult } from "@/app/actions";
import { AddFilmsSheet } from "@/components/movies/add-films-sheet";
import {
  favoriteMovies,
  forgetMovie,
  likeMovies,
  rateMovie,
  type Feedback,
} from "@/components/movies/movie-actions";
import { FilmRow, rankClass } from "@/components/movies/film-row";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListedMovie } from "@/lib/movies/types";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { MAX_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";

type Filter = "all" | Feedback;
type Tab = "favorites" | "seen";

// A film's "Seen it" answer. A favourite carries its own in seenSignal.
const answerOf = (m: ListedMovie) => (m.signal === "favorite" ? m.seenSignal : m.signal);

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
function FavoritesList({ favorites }: { favorites: ListedMovie[] }) {
  if (favorites.length === 0) {
    return <p className="text-body-sm text-mute">Nothing yet. Tap Add to pick the films you love most.</p>;
  }
  return (
    <ol aria-label="Favourites, loved most first" className="divide-y divide-border border-y border-border">
      {favorites.map((m, i) => (
        <FilmRow
          key={m.tmdbId}
          movie={m}
          lead={
            <span className={rankClass} aria-hidden>
              {i + 1}
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

const tabClass =
  "h-11 flex-1 gap-2 rounded-none border-0 px-2 text-body-md text-mute after:bottom-0 after:h-0.5 after:bg-primary data-active:text-ink";

const filmsAdded = (n: number) => (n === 1 ? "Added 1 film" : `Added ${n} films`);

export function MyFilms({ movies, starters }: { movies: ListedMovie[]; starters: SearchResult[] }) {
  const router = useRouter();
  // The tab lives in the URL (?tab=seen), so a refresh or a shared link keeps it.
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "seen" ? "seen" : "favorites";
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === "seen") params.set("tab", next);
    else params.delete("tab");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const [filter, setFilter] = useState<Filter>("all");

  const known = new Set(movies.map((m) => m.tmdbId));
  const favorites = favoritesInOrder(movies);
  const favoriteIds = new Set(favorites.map((m) => m.tmdbId));
  const room = Math.max(0, MAX_FAVORITES - favorites.length);
  // Newest first. "Seen it" holds every film you've watched and answered for,
  // favourites included (legacy "seen" rows show only under All). "Not
  // interested" (down), "Might watch someday" and watchlist films weren't seen
  // and aren't listed here.
  const unseen = new Set(["down", "someday", "watchlist"]);
  const seen = movies.filter((m) => !unseen.has(m.signal)).reverse();
  const countOf = (f: Filter) => (f === "all" ? seen.length : seen.filter((m) => answerOf(m) === f).length);
  const shown = filter === "all" ? seen : seen.filter((m) => answerOf(m) === filter);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as Tab)}
        className="gap-5"
      >
        <TabsList variant="line" className="w-full gap-0 border-b border-border p-0">
          <TabsTrigger value="favorites" className={tabClass}>
            Favourites
            <span className="font-mono text-code text-mute">{favorites.length}</span>
          </TabsTrigger>
          <TabsTrigger value="seen" className={tabClass}>
            Seen it
            <span className="font-mono text-code text-mute">{seen.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-body-sm text-mute">
              {favorites.length < MIN_FAVORITES
                ? `Pick at least ${MIN_FAVORITES} to unlock recommendations.`
                : room === 0
                  ? `Loved most at the top. ${MAX_FAVORITES} is the most; remove one to add another.`
                  : "Loved most at the top."}
            </p>
            {favorites.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="px-3 text-body-sm font-semibold"
                render={<Link href="/my-movies/favourites" />}
                nativeButton={false}
              >
                <PencilIcon />
                Edit
              </Button>
            )}
            {room > 0 && (
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
            )}
          </div>
          <FavoritesList favorites={favorites} />
        </TabsContent>

        <TabsContent value="seen" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-body-sm text-mute">Newest first.</p>
            <AddFilmsSheet
              title="Add films you’ve seen"
              description="Tap the films you liked. Each one shapes your recommendations."
              starters={starters}
              lockedReason={(m) => (known.has(m.tmdbId) ? "In your list" : null)}
              add={async (picks) => {
                const result = await likeMovies(picks.map((m) => m.tmdbId));
                if (result.ok) toast.success(filmsAdded(picks.length));
                return result.ok;
              }}
            />
          </div>
          <ToggleGroup
            aria-label="Filter by how it was"
            value={[filter]}
            onValueChange={(next) => setFilter((next[0] as Filter | undefined) ?? "all")}
            className="w-full flex-wrap gap-1.5"
          >
            {[{ feedback: "all" as const, short: "All", icon: null }, ...ANSWERS].map(({ feedback, short, icon: Icon }) => (
              <ToggleGroupItem
                key={feedback}
                value={feedback}
                variant="outline"
                className="h-9 gap-1.5 rounded-full border-border px-3 text-body-sm text-body aria-pressed:border-primary-soft aria-pressed:bg-transparent aria-pressed:text-ink"
              >
                {Icon && <Icon />}
                {short}
                <span className="font-mono text-code text-mute">{countOf(feedback)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {shown.length === 0 ? (
            <p className="text-body-sm text-mute">
              {filter === "all"
                ? "Tap “Seen it” on a recommendation and say how it was, or tap Add to pick films you’ve loved."
                : `Nothing marked “${ANSWERS.find((a) => a.feedback === filter)?.label}” yet.`}
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shown.map((m) => (
                <SeenRow key={m.tmdbId} movie={m} favoritesFull={room === 0} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
