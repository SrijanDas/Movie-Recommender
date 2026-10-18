"use client";

// Guest movie list in localStorage. Signed-in users use Postgres instead
// (lib/movies/store.ts); /auth sign-in imports this list into the account.

import { useSyncExternalStore } from "react";
import { SIGNALS, type Signal } from "@/lib/recommend/types";
import { GUEST_MOVIE_LIMIT, type UserMovie } from "./types";

const KEY = "next-reel:movies:v1";
const EMPTY: UserMovie[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedList: UserMovie[] = EMPTY;

function isSignal(value: unknown): value is Signal {
  return typeof value === "string" && (SIGNALS as readonly string[]).includes(value);
}

function parse(raw: string | null): UserMovie[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data.flatMap((m): UserMovie[] =>
      m &&
      Number.isInteger(m.tmdbId) &&
      m.tmdbId > 0 &&
      isSignal(m.signal) &&
      typeof m.title === "string"
        ? [
            {
              tmdbId: m.tmdbId,
              signal: m.signal,
              rank: Number.isInteger(m.rank) && m.rank >= 0 ? m.rank : null,
              title: m.title,
              posterPath: typeof m.posterPath === "string" ? m.posterPath : null,
              year: Number.isInteger(m.year) ? m.year : null,
            },
          ]
        : [],
    );
  } catch {
    return EMPTY;
  }
}

// Storage can throw (private mode, blocked site data); treat that as empty.
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): UserMovie[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function write(list: UserMovie[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    return false;
  }
  listeners.forEach((notify) => notify());
  return true;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Keep other tabs in step.
  const onStorage = (e: StorageEvent) => e.key === KEY && notify();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

// null until hydrated: the server can't see localStorage, so callers show a
// skeleton rather than flashing an empty list.
export function useLocalMovies(): UserMovie[] | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function readLocalMovies(): UserMovie[] {
  return snapshot();
}

export type LocalResult = { ok: true } | { ok: false; reason: "limit" | "storage" };

// Insert or overwrite. Refuses (without partial writes) past the guest limit.
export function putLocalMovies(movies: UserMovie[], { removeIds = [] as number[] } = {}): LocalResult {
  const byId = new Map(snapshot().map((m) => [m.tmdbId, m]));
  for (const id of removeIds) byId.delete(id);
  for (const m of movies) {
    byId.delete(m.tmdbId); // re-insert so it counts as most recent
    byId.set(m.tmdbId, m);
  }
  if (byId.size > GUEST_MOVIE_LIMIT) return { ok: false, reason: "limit" };
  return write([...byId.values()]) ? { ok: true } : { ok: false, reason: "storage" };
}

// Put the guest's favourites in this order (ids must be their favourites).
export function reorderLocalFavorites(ids: number[]): LocalResult {
  const rank = new Map(ids.map((id, i) => [id, i]));
  const list = snapshot().map((m) =>
    m.signal === "favorite" && rank.has(m.tmdbId) ? { ...m, rank: rank.get(m.tmdbId)! } : m,
  );
  return write(list) ? { ok: true } : { ok: false, reason: "storage" };
}

export function removeLocalMovies(ids: number[]) {
  const drop = new Set(ids);
  write(snapshot().filter((m) => !drop.has(m.tmdbId)));
}

export function clearLocalMovies() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((notify) => notify());
}
