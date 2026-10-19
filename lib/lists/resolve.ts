// Which films a shared list shows, in order. Pure — safe on server and client.
// See docs/lists.md.

import {
  filterMyFilms,
  isMyFilmsFilter,
  watchlistOf,
  type MovieSnapshot,
  type UserMovie,
} from "@/lib/movies/types";
import type { ListSource } from "./rules";

export type ListFilm = MovieSnapshot & { tmdbId: number };

export type ListItem = ListFilm & {
  position: number;
  // Synced lists: a source film the owner took out.
  hidden: boolean;
  // Synced lists: a film the owner put in that isn't in the source.
  added: boolean;
};

export type ListSettings = {
  source: ListSource | null;
  sourceFilter: string | null;
  synced: boolean;
};

// The films a list's source holds right now, in the order that source shows
// them: the watchlist newest first; My films as its filter lists them.
export function sourceFilms(movies: UserMovie[], source: ListSource | null, filter: string | null): ListFilm[] {
  const films =
    source === "watchlist"
      ? watchlistOf(movies)
      : source === "my_films"
        ? filterMyFilms(movies, isMyFilmsFilter(filter) ? filter : "all")
        : [];
  return films.map(({ tmdbId, title, posterPath, year }) => ({ tmdbId, title, posterPath, year }));
}

// The films the list shows. A copy shows its items as saved. A synced list
// shows its items in their saved order, minus films the owner took out and
// films that have left the source (unless the owner added them), then any
// film that joined the source since, at the end, in source order.
export function resolveList(list: ListSettings, items: ListItem[], movies: UserMovie[]): ListFilm[] {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  if (!list.synced) return ordered.filter((i) => !i.hidden).map(toFilm);

  const source = sourceFilms(movies, list.source, list.sourceFilter);
  const inSource = new Map(source.map((f) => [f.tmdbId, f]));
  const known = new Set(items.map((i) => i.tmdbId));
  return [
    ...ordered
      .filter((i) => !i.hidden && (i.added || inSource.has(i.tmdbId)))
      .map((i) => inSource.get(i.tmdbId) ?? toFilm(i)),
    ...source.filter((f) => !known.has(f.tmdbId)),
  ];
}

const toFilm = ({ tmdbId, title, posterPath, year }: ListItem): ListFilm => ({ tmdbId, title, posterPath, year });
