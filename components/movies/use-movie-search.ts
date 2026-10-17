"use client";

import { useEffect, useRef, useState } from "react";
import { searchMoviesAction, type SearchResult } from "@/app/actions";

const DEBOUNCE_MS = 250;
export const MIN_QUERY = 2;

// Debounced TMDB search. Results are stored with the query they answer, so
// a slow response for an old query never shows up under a newer one.
export function useMovieSearch() {
  const [query, setQueryState] = useState("");
  const [found, setFound] = useState<{ query: string; results: SearchResult[] }>({ query: "", results: [] });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setQuery = (value: string) => {
    setQueryState(value);
    clearTimeout(timer.current);
    const next = value.trim();
    if (next.length < MIN_QUERY) return;
    timer.current = setTimeout(async () => {
      const hits = await searchMoviesAction(next);
      setFound((prev) => (prev.query === next ? prev : { query: next, results: hits }));
    }, DEBOUNCE_MS);
  };

  const q = query.trim();
  const active = q.length >= MIN_QUERY;
  return {
    query,
    setQuery,
    trimmed: q,
    active,
    results: found.query === q ? found.results : [],
    loading: active && found.query !== q,
  };
}
