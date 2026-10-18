"use client";

import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import { rateMovie, undoRating, type Rating } from "@/components/movies/movie-actions";
import { RecommendationCard } from "@/components/movies/recommendation-card";
import { GRID, Notice } from "@/components/movies/recommendation-grid";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

// The recommendation grid. Acting on a card removes only that card; the list
// is recomputed only when the user taps Refresh. Signed in, Refresh re-renders
// the server list; guests pass their own `onRefresh`.
export function RecommendationList({
  recommendations,
  signedIn,
  onRefresh,
  refreshing: refreshingProp,
}: {
  recommendations: Recommendation[];
  signedIn: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const router = useRouter();
  const [routerRefreshing, startRefresh] = useTransition();
  const refresh = onRefresh ?? (() => startRefresh(() => router.refresh()));
  const refreshing = refreshingProp ?? routerRefreshing;

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
    const result = await rateMovie(signedIn, { tmdbId, title, posterPath, year, signal: rating });
    if (!result.ok) return setShown(tmdbId, true);
    const answer = ANSWERS.find((a) => a.feedback === rating);
    toast(rating === "down" ? `Hid ${title}` : (answer?.ack ?? "Noted."), {
      description: rating === "down" ? "You’ll see fewer films like it." : `${answer?.label}: ${title}`,
      action: {
        label: "Undo",
        onClick: () => void undoRating(signedIn, tmdbId).then((r) => r.ok && setShown(tmdbId, true)),
      },
    });
  }

  const shown = recommendations.filter((r) => !hidden.has(r.tmdbId));

  const refreshButton = (
    <Button variant="outline" className="h-9 gap-1.5 px-3 text-body-sm" onClick={refresh} disabled={refreshing}>
      <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
      {refreshing ? "Refreshing" : "Refresh"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm text-mute" aria-live="polite">
          {refreshing ? "Finding fresh picks…" : `${shown.length} ${shown.length === 1 ? "pick" : "picks"}`}
        </p>
        {refreshButton}
      </div>
      {shown.length === 0 ? (
        <Notice
          title="That’s this batch done"
          body="Refresh for a new set, shaped by everything you just told us."
          action={refreshButton}
        />
      ) : (
        <ul className={cn(GRID, "transition-opacity duration-200", refreshing && "opacity-50")} aria-busy={refreshing}>
          {shown.map((movie, i) => (
            <li key={movie.tmdbId} className="flex">
              <RecommendationCard movie={movie} preload={i < 4} onRate={(rating) => void rate(movie, rating)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
