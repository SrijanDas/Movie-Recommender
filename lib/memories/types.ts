// Memories: "on this day" a film was watched in an earlier year, and recaps
// of the films watched in a month or year just ended. Pure — safe on server
// and client, and imported by the DB schema (so relative imports only).
// See docs/memories.md.

import type { Signal } from "../recommend/types";

export const MEMORY_KINDS = ["on_this_day", "month_recap", "year_recap"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

// One film in a memory, snapshotted when the memory is queued.
export type MemoryFilm = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  watchedAt: string; // ISO timestamp
  // The "Seen it" answer when queued (a favourite's own answer), if any.
  answer: Signal | null;
  favorite: boolean;
};

export type Memory = {
  kind: MemoryKind;
  period: string; // "2026-11-08", "2026-10" or "2025"; see periodOf()
  films: MemoryFilm[];
};
