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
import { ArrowUpDownIcon, CheckIcon, GripVerticalIcon, Loader2Icon, XIcon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useState, useTransition } from "react";
import { FilmRow, rankClass } from "@/components/movies/film-row";
import { saveFavoritesEdit } from "@/components/movies/movie-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ListedMovie } from "@/lib/movies/types";
import { cn } from "@/lib/utils";

// "Move to…": every position in the list, each showing the film there now,
// so a film jumps anywhere in two taps instead of a long drag.
function MoveMenu({
  movie,
  rank,
  titles,
  onMove,
}: {
  movie: ListedMovie;
  rank: number;
  // The list's titles, in order.
  titles: string[];
  onMove: (rank: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-mute hover:text-primary-soft aria-expanded:bg-muted aria-expanded:text-ink"
            aria-label={`Move ${movie.title}`}
            title="Move to…"
          />
        }
      >
        <ArrowUpDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(24rem,var(--available-height))] w-64 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate px-2 py-1.5 text-caption text-mute">
            Move {movie.title} to
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={rank}
            onValueChange={(next: number) => {
              if (next !== rank) onMove(next);
            }}
          >
            {titles.map((title, i) => (
              <DropdownMenuRadioItem
                key={i}
                value={i + 1}
                closeOnClick
                className="h-10 gap-2.5 pl-2 text-body-sm text-ink data-checked:text-primary-soft"
              >
                <span className={rankClass}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{i + 1 === rank ? "Here now" : title}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// One favourite, dragged by its grip. The handle alone starts a drag, so
// scrolling the list on a phone never reorders it by accident.
function SortableFavorite({
  movie,
  rank,
  titles,
  onMove,
  onRemove,
}: {
  movie: ListedMovie;
  rank: number;
  titles: string[];
  onMove: (rank: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: movie.tmdbId,
  });
  return (
    <FilmRow
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
      <MoveMenu movie={movie} rank={rank} titles={titles} onMove={onMove} />
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-mute hover:text-ink"
        aria-label={`Remove ${movie.title}`}
        title="Remove"
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </FilmRow>
  );
}

const sameOrder = (a: ListedMovie[], b: ListedMovie[]) =>
  a.length === b.length && a.every((m, i) => m.tmdbId === b[i].tmdbId);

// Rank favourites, loved most first: drag a grip (keyboard: focus it, Space,
// arrows, Space), pick a new position from a film's Move menu (the quick way
// to rank a new one, since they join at the bottom), or remove it. Nothing is saved
// until Done; Cancel, or leaving the page, discards the edit.
export function FavoritesEditor({ favorites }: { favorites: ListedMovie[] }) {
  // The unsaved edit, on top of the saved list; null when there is none, so
  // the page always shows the latest favourites (say, after adding some).
  const [draft, setOrder] = useState<ListedMovie[] | null>(null);
  const order = draft ?? favorites;
  const [saving, startSaving] = useTransition();
  const router = useRouter();
  const dndId = useId(); // stable ids, so server and client HTML match
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const removed = favorites.length - order.length;
  const dirty = draft !== null && !sameOrder(draft, favorites);

  // Next keeps this page mounted but hidden after you leave it (Cache
  // Components → <Activity>). Drop the draft on hide, so Cancel, a tab or
  // Back all discard it and the next visit starts from the saved list.
  useLayoutEffect(() => () => setOrder(null), []);

  // Warn before a reload or closing the tab throws away unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.findIndex((m) => m.tmdbId === active.id);
    const to = order.findIndex((m) => m.tmdbId === over.id);
    setOrder(arrayMove(order, from, to));
  };

  const done = () =>
    startSaving(async () => {
      if (dirty) {
        const result = await saveFavoritesEdit(order.map((m) => m.tmdbId));
        if (!result.ok) return;
      }
      router.push("/my-movies?show=favourites");
    });

  return (
    <>
      {order.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-mute">
          You’ve removed every favourite. Tap Done to save, or Cancel to keep them.
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={order.map((m) => m.tmdbId)} strategy={verticalListSortingStrategy}>
            <ol aria-label="Favourites, loved most first" className="divide-y divide-border border-y border-border">
              {order.map((m, i) => (
                <SortableFavorite
                  key={m.tmdbId}
                  movie={m}
                  rank={i + 1}
                  titles={order.map((o) => o.title)}
                  onMove={(to) => setOrder(arrayMove(order, i, to - 1))}
                  onRemove={() => setOrder(order.filter((o) => o.tmdbId !== m.tmdbId))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {/* Sticky action bar: in thumb reach above the tab bar on phones. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-body-sm text-mute" aria-live="polite">
            {!dirty
              ? "No changes yet."
              : removed > 0
                ? `${removed} removed · not saved`
                : "Not saved yet."}
          </p>
          <Button
            variant="ghost"
            size="lg"
            className="px-3 text-body-sm text-body"
            render={<Link href="/my-movies?show=favourites" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button size="lg" className="px-4 text-body-sm font-semibold" disabled={saving} onClick={done}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
