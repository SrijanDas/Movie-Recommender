"use client";

import {
  BanIcon,
  BookmarkCheckIcon,
  BookmarkPlusIcon,
  CheckIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  StarIcon,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import { forgetMovie, rateMovie, watchLater, type Feedback } from "@/components/movies/movie-actions";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MovieSnapshot } from "@/lib/movies/types";
import type { Signal } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

// The film page's actions: say how it was (or change your answer), save it to
// the watchlist, or (like a recommendation card's menu) pass on it for now or
// for good. The answer starts from the server and is then kept
// here, since the actions don't refresh the page.
export function MovieVerdict({
  tmdbId,
  snapshot,
  saved,
}: {
  tmdbId: number;
  snapshot: MovieSnapshot;
  saved: Signal | null;
}) {
  const [answered, setAnswered] = useState<Signal | null>(saved);
  const [signal, setSignal] = useOptimistic<Signal | null, Signal | null>(answered, (_, next) => next);
  const [, startTransition] = useTransition();

  if (signal === "favorite") {
    return (
      <p className="flex h-10 items-center gap-2 text-body-sm text-body">
        <StarIcon className="size-4 text-primary-soft" aria-hidden />
        One of your favourites
      </p>
    );
  }

  const rate = (feedback: Feedback) =>
    startTransition(async () => {
      setSignal(feedback);
      const result = await rateMovie({ tmdbId, ...snapshot, signal: feedback });
      if (!result.ok) return;
      setAnswered(feedback);
      toast(ANSWERS.find((a) => a.feedback === feedback)?.ack);
    });

  const onWatchlist = signal === "watchlist";
  const toggleWatchlist = () =>
    startTransition(async () => {
      setSignal(onWatchlist ? null : "watchlist");
      const result = onWatchlist ? await forgetMovie(tmdbId) : await watchLater(tmdbId);
      if (!result.ok) return;
      setAnswered(onWatchlist ? null : "watchlist");
      toast(onWatchlist ? "Removed from your watchlist" : "Added to your watchlist");
    });

  // "Not interested" / "Might watch someday"; picking the current one again
  // takes it back.
  const pass = (choice: "down" | "someday") =>
    startTransition(async () => {
      const undo = signal === choice;
      setSignal(undo ? null : choice);
      const result = undo ? await forgetMovie(tmdbId) : await rateMovie({ tmdbId, ...snapshot, signal: choice });
      if (!result.ok) return;
      setAnswered(undo ? null : choice);
      toast(
        undo
          ? "Answer cleared"
          : choice === "down"
            ? "Noted. You’ll see fewer films like it."
            : "Noted. Hidden from your picks for now.",
      );
    });

  const current = ANSWERS.some((a) => a.feedback === signal) ? (signal as Feedback) : null;
  return (
    <div className="flex items-center gap-1.5 sm:w-80">
      <SeenItMenu title={snapshot.title} current={current} onRate={rate} className="min-w-0 flex-1" />
      {/* Once you've said how it was, it's no longer something to watch later. */}
      {!current && (
        <Button
          variant="outline"
          size="icon"
          className={cn("size-10 shrink-0", onWatchlist ? "border-primary-soft text-primary-soft" : "text-body")}
          aria-label={onWatchlist ? `Remove ${snapshot.title} from your watchlist` : `Add ${snapshot.title} to your watchlist`}
          aria-pressed={onWatchlist}
          title={onWatchlist ? "On your watchlist" : "Add to watchlist"}
          onClick={toggleWatchlist}
        >
          {onWatchlist ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
        </Button>
      )}
      {!current && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 text-body aria-expanded:text-ink"
                aria-label={`More options for ${snapshot.title}`}
              />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52 p-1.5">
            {PASSES.map(({ choice, label, icon: Icon }) => (
              <DropdownMenuItem
                key={choice}
                className="h-10 gap-2.5 px-2 text-body-sm text-ink"
                onClick={() => pass(choice)}
              >
                <Icon />
                {label}
                {signal === choice && <CheckIcon className="ml-auto text-primary-soft" aria-label="(selected)" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

const PASSES = [
  { choice: "down", label: "Not interested", icon: BanIcon },
  { choice: "someday", label: "Might watch someday", icon: ClockIcon },
] as const;
