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
import { ArrowUpDownIcon, GripVerticalIcon, XIcon } from "lucide-react";
import { useId } from "react";
import { FilmRow, rankClass, type RowFilm } from "@/components/movies/film-row";
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
import { cn } from "@/lib/utils";

// "Move to…": every position in the list, each showing the film there now,
// so a film jumps anywhere in two taps instead of a long drag.
function MoveMenu({
  movie,
  rank,
  titles,
  onMove,
}: {
  movie: RowFilm;
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

// One film, dragged by its grip. The handle alone starts a drag, so
// scrolling the list on a phone never reorders it by accident.
function SortableFilmRow({
  movie,
  rank,
  titles,
  onMove,
  onRemove,
}: {
  movie: RowFilm;
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

// A ranked list to put in order: drag a grip (keyboard: focus it, Space,
// arrows, Space), pick a new position from a film's Move menu, or remove one.
// Used by the favourites editor and the list editor.
export function SortableFilmList<T extends RowFilm>({
  films,
  label,
  onReorder,
  onRemove,
}: {
  films: T[];
  label: string;
  onReorder: (films: T[]) => void;
  onRemove: (film: T) => void;
}) {
  const dndId = useId(); // stable ids, so server and client HTML match
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = films.findIndex((m) => m.tmdbId === active.id);
    const to = films.findIndex((m) => m.tmdbId === over.id);
    onReorder(arrayMove(films, from, to));
  };
  const titles = films.map((m) => m.title);
  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={films.map((m) => m.tmdbId)} strategy={verticalListSortingStrategy}>
        <ol aria-label={label} className="divide-y divide-border border-y border-border">
          {films.map((m, i) => (
            <SortableFilmRow
              key={m.tmdbId}
              movie={m}
              rank={i + 1}
              titles={titles}
              onMove={(to) => onReorder(arrayMove(films, i, to - 1))}
              onRemove={() => onRemove(m)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
