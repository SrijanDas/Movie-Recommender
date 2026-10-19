"use client";

import { RotateCwIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recommendation } from "@/lib/recommend/types";

type FeedStatus = "idle" | "loading" | "error" | "done";

// The recommendation feed: the server renders the first batch, and scrolling
// near the end loads the next one (`moreRecommendations`), skipping every film
// already loaded. Each batch reads the user's list fresh, so answers given
// while scrolling shape what comes next. Acting on a card removes only that
// card.
export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const [items, setItems] = useState(recommendations);
  const [status, setStatus] = useState<FeedStatus>("idle");
  const loading = useRef(false);

  const loadMore = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setStatus("loading");
    const next = await loadMoreRecommendations(items.map((m) => m.tmdbId));
    loading.current = false;
    if (next === null) return setStatus("error");
    const known = new Set(items.map((m) => m.tmdbId));
    const fresh = next.filter((m) => !known.has(m.tmdbId));
    if (fresh.length === 0) return setStatus("done");
    setItems([...items, ...fresh]);
    setStatus("idle");
  }, [items]);

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

  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
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

  const shown = items.filter((r) => !hidden.has(r.tmdbId));

  return (
    <div className="flex flex-col gap-8">
      {shown.length > 0 && (
        <ul className={GRID}>
          {shown.map((movie, i) => (
            <li key={movie.tmdbId} className="flex">
              <RecommendationCard
                movie={movie}
                preload={i < 4}
                onRate={(rating) => void rate(movie, rating)}
                onWatchlist={() => void saveForLater(movie)}
              />
            </li>
          ))}
          {status === "loading" &&
            Array.from({ length: 5 }, (_, i) => (
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
