"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, Loader2Icon, StarIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS, verdictOf } from "@/components/movies/feedback";
import {
  favoriteMovie,
  forgetMovie,
  likeMovie,
  reorderFavorites,
  type Feedback,
} from "@/components/movies/movie-actions";
import { MovieSearch } from "@/components/movies/movie-search";
import { Poster } from "@/components/movies/poster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocalMovies } from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT, type UserMovie } from "@/lib/movies/types";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { cn } from "@/lib/utils";
import { MAX_FAVORITES, MIN_FAVORITES } from "@/lib/recommend/types";

type Filter = "all" | Feedback;
type Tab = "favorites" | "seen";

function RemoveButton({ movie, signedIn }: { movie: UserMovie; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Remove ${movie.title}`}
      disabled={pending}
      onClick={() => startTransition(async () => void (await forgetMovie(signedIn, movie.tmdbId)))}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
    </Button>
  );
}

function Row({
  movie,
  lead,
  meta,
  children,
  ref,
  style,
  className,
}: {
  movie: UserMovie;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  ref?: React.Ref<HTMLLIElement>;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <li ref={ref} style={style} className={cn("flex items-center gap-3 py-2.5", className)}>
      {lead}
      <Poster path={movie.posterPath} title={movie.title} size="w92" sizes="40px" className="w-10 shrink-0 rounded-sm" />
      <p className="min-w-0 flex-1">
        <span className="block truncate text-body-md text-ink">{movie.title}</span>
        <span className="flex items-center gap-1.5 text-caption text-mute">
          {movie.year}
          {meta && movie.year && <span aria-hidden>·</span>}
          {meta}
        </span>
      </p>
      <span className="flex shrink-0 items-center gap-0.5">{children}</span>
    </li>
  );
}

// One favourite, dragged by its grip. The handle alone starts a drag, so
// scrolling the list on a phone never reorders it by accident.
function SortableFavorite({ movie, rank, signedIn }: { movie: UserMovie; rank: number; signedIn: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: movie.tmdbId,
  });
  return (
    <Row
      ref={setNodeRef}
      movie={movie}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative bg-background", isDragging && "z-10 rounded-lg bg-muted shadow-glow")}
      lead={
        <>
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Reorder ${movie.title}`}
            className="-ml-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-mute outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <span className="w-4 shrink-0 text-center font-mono text-code text-mute tabular-nums" aria-hidden>
            {rank}
          </span>
        </>
      }
    >
      <RemoveButton movie={movie} signedIn={signedIn} />
    </Row>
  );
}

// Favourites, ranked by drag and drop (keyboard: focus a grip, Space, arrows,
// Space). The new order shows at once and is saved in the background.
function FavoritesList({ favorites, signedIn }: { favorites: UserMovie[]; signedIn: boolean }) {
  const [order, setOrder] = useOptimistic(favorites, (_, next: UserMovie[]) => next);
  const [pending, startTransition] = useTransition();
  const dndId = useId(); // stable ids, so server and client HTML match
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.findIndex((m) => m.tmdbId === active.id);
    const to = order.findIndex((m) => m.tmdbId === over.id);
    const next = arrayMove(order, from, to);
    startTransition(async () => {
      setOrder(next);
      await reorderFavorites(
        signedIn,
        next.map((m) => m.tmdbId),
      );
    });
  };

  if (order.length === 0) {
    return (
      <p className="text-body-sm text-mute">
        Nothing yet. Add films above, or{" "}
        <Link href="/" className="font-semibold text-primary-soft underline">
          pick from the grid
        </Link>
        .
      </p>
    );
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order.map((m) => m.tmdbId)} strategy={verticalListSortingStrategy}>
        <ol aria-label="Favourites, loved most first" aria-busy={pending} className="divide-y divide-border border-y border-border">
          {order.map((m, i) => (
            <SortableFavorite key={m.tmdbId} movie={m} rank={i + 1} signedIn={signedIn} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SeenRow({ movie, signedIn, showVerdict, favoritesFull }: { movie: UserMovie; signedIn: boolean; showVerdict: boolean; favoritesFull: boolean }) {
  const [pending, startTransition] = useTransition();
  const verdict = showVerdict ? verdictOf(movie.signal) : undefined;
  const promote = () =>
    startTransition(async () => {
      const result = await favoriteMovie(signedIn, movie);
      if (result.ok) toast.success(`${movie.title} is now a favourite`);
    });
  return (
    <Row
      movie={movie}
      meta={
        verdict && (
          <>
            <verdict.icon className="size-3" aria-hidden />
            {verdict.label}
          </>
        )
      }
    >
      <Button
        variant="ghost"
        size="icon"
        className="hover:text-primary-soft"
        aria-label={`Make ${movie.title} a favourite`}
        title={favoritesFull ? `Favourites are full (${MAX_FAVORITES})` : "Make a favourite"}
        disabled={pending}
        onClick={promote}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <StarIcon />}
      </Button>
      <RemoveButton movie={movie} signedIn={signedIn} />
    </Row>
  );
}

function GuestUsage({ count }: { count: number }) {
  const full = count >= GUEST_MOVIE_LIMIT;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-body">Saved on this device</span>
        <span className="font-mono text-code text-ink">
          {count}/{GUEST_MOVIE_LIMIT}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={full ? "h-full bg-primary-soft" : "h-full bg-body"}
          style={{ width: `${Math.min(100, (count / GUEST_MOVIE_LIMIT) * 100)}%` }}
        />
      </div>
      <p className="text-body-sm text-mute">
        {full ? "This device is full. " : ""}
        <Link href="/sign-in" className="font-semibold text-primary-soft underline">
          Sign in
        </Link>{" "}
        to sync your films to all your devices and save more than {GUEST_MOVIE_LIMIT}.
      </p>
    </div>
  );
}

const tabClass =
  "h-11 flex-1 gap-2 rounded-none border-0 px-2 text-body-md text-mute after:bottom-0 after:h-0.5 after:bg-primary data-active:text-ink";

export function MyFilms({ signedIn, saved }: { signedIn: boolean; saved: UserMovie[] }) {
  const local = useLocalMovies();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("favorites");
  const [filter, setFilter] = useState<Filter>("all");

  if (!signedIn && local === null) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-11" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const movies = signedIn ? saved : (local ?? []);
  const known = new Set(movies.map((m) => m.tmdbId));
  const favorites = favoritesInOrder(movies);
  const favoritesFull = favorites.length >= MAX_FAVORITES;
  // Newest first. "Seen it" holds every film you've watched and answered for
  // (legacy "seen" rows show only under All). "Not interested" (down) films
  // weren't seen and aren't listed; they only steer recommendations.
  const seen = movies.filter((m) => m.signal !== "favorite" && m.signal !== "down").reverse();
  const countOf = (f: Filter) => (f === "all" ? seen.length : seen.filter((m) => m.signal === f).length);
  const shown = filter === "all" ? seen : seen.filter((m) => m.signal === filter);

  return (
    <div className="flex flex-col gap-6">
      {!signedIn && <GuestUsage count={movies.length} />}
      <Tabs value={tab} onValueChange={(next) => setTab(next as Tab)} className="gap-6">
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
          <MovieSearch
            size="md"
            label="Add a favourite"
            placeholder={favoritesFull ? `Favourites are full (${MAX_FAVORITES})` : "Add a favourite"}
            disabledReason={(m) =>
              favorites.some((f) => f.tmdbId === m.tmdbId) ? "A favourite" : favoritesFull ? "List full" : null
            }
            onPick={(movie) =>
              startTransition(async () => {
                const result = await favoriteMovie(signedIn, { ...movie, signal: "favorite" });
                if (result.ok) toast.success(`Added ${movie.title}`);
              })
            }
          />
          <p className="text-body-sm text-mute">
            {favorites.length < MIN_FAVORITES
              ? `Pick at least ${MIN_FAVORITES} to unlock recommendations. `
              : "Loved most at the top. The higher a film sits, the more it shapes your picks. "}
            Up to {MAX_FAVORITES}.
          </p>
          <FavoritesList favorites={favorites} signedIn={signedIn} />
        </TabsContent>

        <TabsContent value="seen" className="flex flex-col gap-4">
          <MovieSearch
            size="md"
            label="Add a film you loved"
            placeholder="Add a film you loved"
            disabledReason={(m) => (known.has(m.tmdbId) ? "In your list" : null)}
            onPick={(movie) =>
              startTransition(async () => {
                const result = await likeMovie(signedIn, { ...movie, signal: "liked" });
                if (result.ok) toast.success(`Added ${movie.title}`);
              })
            }
          />
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
                ? "Tap “Seen it” on a recommendation and say how it was, or add a film you loved above."
                : `Nothing marked “${ANSWERS.find((a) => a.feedback === filter)?.label}” yet.`}
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shown.map((m) => (
                <SeenRow key={m.tmdbId} movie={m} signedIn={signedIn} showVerdict={filter === "all"} favoritesFull={favoritesFull} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
