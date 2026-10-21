"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCwIcon, RotateCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import {
  loadMoreRecommendations,
  rateMovie,
  undoRating,
  watchLater,
  type Rating,
} from "@/components/movies/movie-actions";
import { RecommendationCard } from "@/components/movies/recommendation-card";
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
// while scrolling shape what comes next. Acting on a card removes only that
// card. Refresh starts over with a new batch: it is computed from the list as
// it is now and skips every film this visit has shown, so the grid is all new.
export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const [items, setItems] = useState(recommendations);
  const [status, setStatus] = useState<FeedStatus>("idle");
  const loading = useRef(false);
  // Cards acted on (rated, hidden, saved): removed in place, with Undo.
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  // Every film shown this visit, across refreshes: never shown again.
  const everShown = useRef(recommendations.map((m) => m.tmdbId));
  // The latest batch, in order, so only its cards stagger in.
  const [batch, setBatch] = useState<number[]>([]);

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
      setHidden(new Set());
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
  // batch, or every card hidden), so the feed keeps filling.
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

  const setShown = (id: number, shown: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (shown) next.delete(id);
      else next.add(id);
      return next;
    });

  async function rate(movie: Recommendation, rating: Rating) {
    const { tmdbId, title, posterPath, year } = movie;
    setShown(tmdbId, false);
    const result = await rateMovie({ tmdbId, title, posterPath, year, signal: rating });
    if (!result.ok) return setShown(tmdbId, true);
    const answer = ANSWERS.find((a) => a.feedback === rating);
    const [message, description] =
      rating === "down"
        ? [`Hid ${title}`, "You’ll see fewer films like it."]
        : rating === "someday"
          ? [`Hid ${title} for now`, "Your picks stay the same."]
          : [answer?.ack ?? "Noted.", `${answer?.label}: ${title}`];
    toast(message, {
      description,
      action: {
        label: "Undo",
        onClick: () => void undoRating(tmdbId).then((r) => r.ok && setShown(tmdbId, true)),
      },
    });
  }

  async function saveForLater({ tmdbId, title }: Recommendation) {
    setShown(tmdbId, false);
    const result = await watchLater(tmdbId);
    if (!result.ok) return setShown(tmdbId, true);
    toast("Added to your watchlist", {
      description: title,
      action: {
        label: "Undo",
        onClick: () => void undoRating(tmdbId).then((r) => r.ok && setShown(tmdbId, true)),
      },
    });
  }

  const shown = status === "refreshing" ? [] : items.filter((r) => !hidden.has(r.tmdbId));
  const refreshing = status === "refreshing";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm text-mute" aria-live="polite">
          {refreshing ? "Finding fresh picks…" : `${shown.length} ${shown.length === 1 ? "pick" : "picks"}`}
        </p>
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

      {(shown.length > 0 || refreshing) && (
        // A card you act on shrinks away and the rest slide into its place;
        // the first batch is already on screen, later ones fade up in turn.
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
                  onRate={(rating) => void rate(movie, rating)}
                  onWatchlist={() => void saveForLater(movie)}
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
          <p className="text-body-sm text-mute">Finding more films…</p>
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
