"use client";

import { StarIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import { rateMovie, type Feedback } from "@/components/movies/movie-actions";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalMovies } from "@/lib/movies/local";
import type { MovieSnapshot } from "@/lib/movies/types";
import type { Signal } from "@/lib/recommend/types";

// The film page's one action: say how it was, or change your answer.
// Signed-in users' answer starts from the server and is then kept here (the
// action doesn't refresh the page); guests' comes from this browser's list.
export function MovieVerdict({
  tmdbId,
  snapshot,
  signedIn,
  saved,
}: {
  tmdbId: number;
  snapshot: MovieSnapshot;
  signedIn: boolean;
  saved: Signal | null;
}) {
  const local = useLocalMovies();
  const [answered, setAnswered] = useState<Signal | null>(saved);
  const stored = signedIn ? answered : (local?.find((m) => m.tmdbId === tmdbId)?.signal ?? null);
  const [signal, setSignal] = useOptimistic<Signal | null, Feedback>(stored, (_, next) => next);
  const [, startTransition] = useTransition();

  if (!signedIn && local === null) return <Skeleton className="h-10 w-full sm:w-56" />;

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
      const result = await rateMovie(signedIn, { tmdbId, ...snapshot, signal: feedback });
      if (!result.ok) return;
      setAnswered(feedback);
      toast(ANSWERS.find((a) => a.feedback === feedback)?.ack);
    });

  const current = ANSWERS.some((a) => a.feedback === signal) ? (signal as Feedback) : null;
  return <SeenItMenu title={snapshot.title} current={current} onRate={rate} className="sm:w-56" />;
}
