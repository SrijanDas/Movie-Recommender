"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCwIcon, RotateCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadMoreRecommendations,
  rateMovie,
  undoRating,
  watchLater,
} from "@/components/movies/movie-actions";
import { GenreFilterButton, inGenre } from "@/components/movies/film-filter";
import { RecommendationCard, type Acted } from "@/components/movies/recommendation-card";
import { GRID, Notice } from "@/components/movies/recommendation-grid";
import { CARD_PRESENCE, CARD_TRANSITION, staggerDelay } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/recommend/types";

type FeedStatus = "idle" | "loading" | "refreshing" | "error" | "done";

// The recommendation feed: the server renders the first batch, and scrolling
// near the end loads the next one (`moreRecommendations`), skipping every film
// already loaded. Each batch reads the user's list fresh, so answers given
// while scrolling shape what comes next. Acting on a card leaves it in place,
// marked with what was done and an Undo, so the grid never shifts under your
// thumb; Refresh drops those cards. Refresh starts over with a new batch: it
// is computed from the list as it is now and skips every film this visit has
// shown, so the grid is all new.
// Filter narrows the grid to one genre once applied; while too few cards
// match to fill the screen, the feed keeps loading batches to find more.
export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const [items, setItems] = useState(recommendations);
  const [status, setStatus] = useState<FeedStatus>("idle");
  const loading = useRef(false);
  // Cards acted on (rated, hidden, saved), and how: marked in place, with Undo.
  const [acted, setActed] = useState<ReadonlyMap<number, Acted>>(() => new Map());
  // Every film shown this visit, across refreshes: never shown again.
  const everShown = useRef(recommendations.map((m) => m.tmdbId));
  // The latest batch, in order, so only its cards stagger in.
  const [batch, setBatch] = useState<number[]>([]);
  const [genre, setGenre] = useState<string | null>(null);

  const fetchBatch = useCallback(async (replace: boolean) => {
    if (loading.current) return;
    loading.current = true;
    setStatus(replace ? "refreshing" : "loading");
    const next = await loadMoreRecommendations(everShown.current);
    loading.current = false;
    if (next === null) return setStatus("error");
    const known = new Set(everShown.current);
    const fresh = next.filter((m) => !known.has(m.tmdbId));
    if (fresh.length === 0) {
      if (replace) setItems([]);
      return setStatus("done");
    }
    everShown.current = [...everShown.current, ...fresh.map((m) => m.tmdbId)];
    setBatch(fresh.map((m) => m.tmdbId));
    if (replace) {
      setItems(fresh);
      setActed(new Map());
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    } else {
      setItems((prev) => [...prev, ...fresh]);
    }
    setStatus("idle");
  }, []);
  const loadMore = useCallback(() => fetchBatch(false), [fetchBatch]);
  const refresh = () => void fetchBatch(true);

  // Load the next batch well before the end comes into view. Re-observing
  // after every batch re-checks a sentinel that is still on screen (a short
  // batch, or too few cards in the chosen genre), so the feed keeps filling.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = sentinel.current;
    if (!target || status !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, status]);

  const mark = (id: number, how: Acted | null) =>
    setActed((prev) => {
      const next = new Map(prev);
      if (how) next.set(id, how);
      else next.delete(id);
      return next;
    });

  async function act(movie: Recommendation, how: Acted) {
    const { tmdbId, title, posterPath, year } = movie;
    mark(tmdbId, how);
    const result =
      how === "watchlist"
        ? await watchLater(tmdbId)
        : await rateMovie({ tmdbId, title, posterPath, year, signal: how });
    if (!result.ok) mark(tmdbId, null);
  }

  async function undo({ tmdbId }: Recommendation) {
    const how = acted.get(tmdbId);
    if (!how) return;
    mark(tmdbId, null);
    const result = await undoRating(tmdbId);
    if (!result.ok) mark(tmdbId, how);
  }

  const remaining = status === "refreshing" ? [] : items;
  const shown = remaining.filter(inGenre(genre));
  const open = shown.filter((r) => !acted.has(r.tmdbId)).length;
  const refreshing = status === "refreshing";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-body-sm text-mute" aria-live="polite">
          {refreshing ? "Finding fresh picks…" : `${open} ${open === 1 ? "pick" : "picks"}`}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <GenreFilterButton
            films={remaining}
            value={genre}
            onChange={setGenre}
            noun={["pick", "picks"]}
            className="min-w-0"
          />
          <Button
            variant="outline"
            className="h-9 gap-1.5 px-3 text-body-sm"
            onClick={refresh}
            disabled={refreshing || status === "loading"}
            title="New picks, from your list as it is now"
          >
            <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {(shown.length > 0 || refreshing) && (
        // The first batch is already on screen; later ones fade up in turn.
        <ul className={cn("relative", GRID)}>
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((movie, i) => (
              <motion.li
                key={movie.tmdbId}
                layout="position"
                {...CARD_PRESENCE}
                transition={{ ...CARD_TRANSITION, delay: staggerDelay(batch.indexOf(movie.tmdbId)) }}
                className="flex"
              >
                <RecommendationCard
                  movie={movie}
                  preload={i < 4}
                  acted={acted.get(movie.tmdbId)}
                  onRate={(rating) => void act(movie, rating)}
                  onWatchlist={() => void act(movie, "watchlist")}
                  onUndo={() => void undo(movie)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
          {(status === "loading" || refreshing) &&
            Array.from({ length: refreshing ? 10 : 5 }, (_, i) => (
              <li key={`loading-${i}`} className="flex flex-col gap-3" aria-hidden>
                <Skeleton className="aspect-2/3 rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/2 rounded-full" />
              </li>
            ))}
        </ul>
      )}

      <div ref={sentinel} aria-live="polite">
        {status === "loading" && shown.length === 0 && (
          <p className="text-body-sm text-mute">{genre ? `Finding more ${genre} films…` : "Finding more films…"}</p>
        )}
        {(status === "idle" || status === "done") && genre && shown.length === 0 && (
          <p className="text-body-sm text-mute">No {genre} picks right now.</p>
        )}
        {status === "loading" && shown.length > 0 && <span className="sr-only">Loading more films</span>}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-body-sm text-body">Couldn’t load more films.</p>
            <Button variant="outline" className="h-9 gap-1.5 px-3 text-body-sm" onClick={() => void loadMore()}>
              <RotateCwIcon />
              Try again
            </Button>
          </div>
        )}
        {status === "done" && (
          <Notice
            title="That’s every film we found for you"
            body="Tell us how a few of these were, or add more favourites, and we’ll find new ones."
            action={
              <Button variant="outline" render={<Link href="/my-movies?show=favourites" />} nativeButton={false}>
                Add favourites
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
