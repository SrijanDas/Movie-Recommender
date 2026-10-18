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
import { CheckIcon, GripVerticalIcon, Loader2Icon, PencilIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS, verdictOf } from "@/components/movies/feedback";
import type { SearchResult } from "@/app/actions";
import { AddFilmsSheet } from "@/components/movies/add-films-sheet";
import {
  favoriteMovies,
  forgetMovie,
  likeMovies,
  reorderFavorites,
  type Feedback,
} from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
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
import type { UserMovie } from "@/lib/movies/types";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { cn } from "@/lib/utils";
import { MIN_FAVORITES } from "@/lib/recommend/types";

type Filter = "all" | Feedback;
type Tab = "favorites" | "seen";

function RemoveButton({ movie }: { movie: UserMovie }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="text-mute hover:text-ink"
      aria-label={`Remove ${movie.title}`}
      disabled={pending}
      onClick={() => startTransition(async () => void (await forgetMovie(movie.tmdbId)))}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
    </Button>
  );
}

// Removing a seen film undoes its answer, so ask first.
function ConfirmRemoveButton({ movie }: { movie: UserMovie }) {
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

function Row({
  movie,
  linked = true,
  lead,
  meta,
  children,
  ref,
  style,
  className,
}: {
  movie: UserMovie;
  // Off while editing, so a stray tap mid-drag never navigates away.
  linked?: boolean;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLLIElement>;
  style?: React.CSSProperties;
  className?: string;
}) {
  const details = (
    <>
      <Poster path={movie.posterPath} title={movie.title} size="w92" sizes="40px" className="w-10 shrink-0 rounded-sm" />
      <p className="min-w-0 flex-1">
        <span className="block truncate text-body-md text-ink group-hover:text-primary-soft">{movie.title}</span>
        <span className="flex items-center gap-1.5 text-caption text-mute">
          {movie.year}
          {meta && movie.year && <span aria-hidden>·</span>}
          {meta}
        </span>
      </p>
    </>
  );
  return (
    <li ref={ref} style={style} className={cn("flex items-center gap-3 py-2.5", className)}>
      {lead}
      {linked ? (
        <Link
          href={`/movie/${movie.tmdbId}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {details}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{details}</div>
      )}
      {children && <span className="flex shrink-0 items-center gap-0.5">{children}</span>}
    </li>
  );
}

const rankClass = "w-4 shrink-0 text-center font-mono text-code text-mute tabular-nums";

// One favourite in edit mode, dragged by its grip. The handle alone starts a
// drag, so scrolling the list on a phone never reorders it by accident.
function SortableFavorite({ movie, rank }: { movie: UserMovie; rank: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: movie.tmdbId,
  });
  return (
    <Row
      ref={setNodeRef}
      movie={movie}
      linked={false}
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
          <span className={rankClass} aria-hidden>
            {rank}
          </span>
        </>
      }
    >
      <RemoveButton movie={movie} />
    </Row>
  );
}

// Favourites, loved most first. Tap a row to open the film; in edit mode,
// drag to rank (keyboard: focus a grip, Space, arrows, Space) and remove.
// A new order shows at once and is saved in the background.
function FavoritesList({ favorites, editing }: { favorites: UserMovie[]; editing: boolean }) {
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
      await reorderFavorites(next.map((m) => m.tmdbId));
    });
  };

  if (order.length === 0) {
    return <p className="text-body-sm text-mute">Nothing yet. Tap Add to pick the films you love most.</p>;
  }

  const listClass = "divide-y divide-border border-y border-border";

  if (!editing) {
    return (
      <ol aria-label="Favourites, loved most first" className={listClass}>
        {order.map((m, i) => (
          <Row
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

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order.map((m) => m.tmdbId)} strategy={verticalListSortingStrategy}>
        <ol aria-label="Favourites, loved most first" aria-busy={pending} className={listClass}>
          {order.map((m, i) => (
            <SortableFavorite key={m.tmdbId} movie={m} rank={i + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SeenRow({ movie, showVerdict }: { movie: UserMovie; showVerdict: boolean }) {
  const [pending, startTransition] = useTransition();
  const verdict = showVerdict ? verdictOf(movie.signal) : undefined;
  const promote = () =>
    startTransition(async () => {
      const result = await favoriteMovies([movie.tmdbId]);
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
        size="icon-lg"
        className="text-mute hover:text-primary-soft"
        aria-label={`Make ${movie.title} a favourite`}
        title="Make a favourite"
        disabled={pending}
        onClick={promote}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <StarIcon />}
      </Button>
      <ConfirmRemoveButton movie={movie} />
    </Row>
  );
}

const tabClass =
  "h-11 flex-1 gap-2 rounded-none border-0 px-2 text-body-md text-mute after:bottom-0 after:h-0.5 after:bg-primary data-active:text-ink";

const filmsAdded = (n: number) => (n === 1 ? "Added 1 film" : `Added ${n} films`);

export function MyFilms({ movies, starters }: { movies: UserMovie[]; starters: SearchResult[] }) {
  const [tab, setTab] = useState<Tab>("favorites");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState(false);

  const known = new Set(movies.map((m) => m.tmdbId));
  const favorites = favoritesInOrder(movies);
  const favoriteIds = new Set(favorites.map((m) => m.tmdbId));
  // Newest first. "Seen it" holds every film you've watched and answered for
  // (legacy "seen" rows show only under All). "Not interested" (down),
  // "Might watch someday" and watchlist films weren't seen and aren't listed here.
  const unseen = new Set(["favorite", "down", "someday", "watchlist"]);
  const seen = movies.filter((m) => !unseen.has(m.signal)).reverse();
  const countOf = (f: Filter) => (f === "all" ? seen.length : seen.filter((m) => m.signal === f).length);
  const shown = filter === "all" ? seen : seen.filter((m) => m.signal === filter);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next as Tab);
          setEditing(false);
        }}
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
              {editing
                ? "Drag to reorder. Higher shapes your picks more."
                : favorites.length < MIN_FAVORITES
                  ? `Pick at least ${MIN_FAVORITES} to unlock recommendations.`
                  : "Loved most at the top."}
            </p>
            {editing ? (
              <Button size="lg" className="px-3 text-body-sm font-semibold" onClick={() => setEditing(false)}>
                <CheckIcon />
                Done
              </Button>
            ) : (
              <>
                {favorites.length > 0 && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-3 text-body-sm font-semibold"
                    onClick={() => setEditing(true)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                )}
                <AddFilmsSheet
                  title="Add favourites"
                  description="Tap the films you love. They join the bottom of your list; rank them with Edit."
                  starters={starters}
                  lockedReason={(m) => (favoriteIds.has(m.tmdbId) ? "Favourite" : null)}
                  add={async (picks) => {
                    const result = await favoriteMovies(picks.map((m) => m.tmdbId));
                    if (result.ok) toast.success(filmsAdded(picks.length));
                    return result.ok;
                  }}
                />
              </>
            )}
          </div>
          <FavoritesList favorites={favorites} editing={editing} />
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
                <SeenRow key={m.tmdbId} movie={m} showVerdict={filter === "all"} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
