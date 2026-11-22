"use client";

import { BookmarkCheckIcon, BookmarkPlusIcon, CheckIcon, EllipsisVerticalIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { forgetSeries, setSeriesSignal } from "@/app/series/actions";
import { ANSWERS } from "@/components/movies/feedback";
import type { Feedback } from "@/components/movies/movie-actions";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Signal } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

// The series page's actions, laid out like a film's (MovieVerdict): Seen it
// in view, the watchlist in the ⋯ menu, which shows a bookmark while saved.
// `share` sits between them. Series have no favourites or passes yet.
export function SeriesVerdict({
  seriesId,
  title,
  saved,
  share,
}: {
  seriesId: number;
  title: string;
  saved: Signal | null;
  share?: React.ReactNode;
}) {
  const [answered, setAnswered] = useState<Signal | null>(saved);
  const [signal, setSignal] = useOptimistic<Signal | null, Signal | null>(answered, (_, next) => next);
  const [, startTransition] = useTransition();

  const rate = (feedback: Feedback) =>
    startTransition(async () => {
      setSignal(feedback);
      const result = await setSeriesSignal(seriesId, feedback);
      if (!result.ok) return void toast.error(result.error);
      setAnswered(feedback);
      toast(ANSWERS.find((a) => a.feedback === feedback)?.ack);
    });

  const onWatchlist = signal === "watchlist";
  const toggleWatchlist = () =>
    startTransition(async () => {
      setSignal(onWatchlist ? null : "watchlist");
      const result = onWatchlist ? await forgetSeries(seriesId) : await setSeriesSignal(seriesId, "watchlist");
      if (!result.ok) return void toast.error(result.error);
      setAnswered(onWatchlist ? null : "watchlist");
      toast(onWatchlist ? "Removed from your watchlist" : "Added to your watchlist");
    });

  const current = ANSWERS.some((a) => a.feedback === signal) ? (signal as Feedback) : null;
  return (
    <div className="flex items-center gap-1.5 sm:w-96">
      <SeenItMenu title={title} current={current} onRate={rate} className="min-w-0 flex-1" />
      {share}
      {/* Once you've said how it was, it's no longer something to watch later. */}
      {!current && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "size-10 shrink-0 aria-expanded:text-ink",
                  onWatchlist ? "border-primary-soft text-primary-soft" : "text-body",
                )}
                aria-label={`More options for ${title}`}
                title={onWatchlist ? "On your watchlist" : undefined}
              />
            }
          >
            {onWatchlist ? <BookmarkCheckIcon /> : <EllipsisVerticalIcon />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52 p-1.5">
            <DropdownMenuItem className="h-10 gap-2.5 px-2 text-body-sm text-ink" onClick={toggleWatchlist}>
              {onWatchlist ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
              {onWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              {onWatchlist && <CheckIcon className="ml-auto text-primary-soft" aria-label="(selected)" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
