"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, ChevronLeftIcon, ClockIcon, UndoIcon, XIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import { didntWatch, rateMovie, snoozeCheckIn, undoRating, watchLater, type Feedback } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { EASE_OUT } from "@/components/site/motion-variants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { UserMovie } from "@/lib/movies/types";

export type CheckInMovie = Pick<UserMovie, "tmdbId" | "title" | "posterPath" | "year"> & { startedVia: string | null };

// Asked once when the app opens, about the film the user started most
// recently (lib/watch/check-in.ts): did they finish it? Finishing asks how
// it was, with the same answers as "Seen it", and moves the film to My
// films. "Still watching" asks again tomorrow; closing the sheet counts as
// that too. "Didn't watch it" leaves the film saved, no longer in progress.
export function WatchCheckInSheet({ movie }: { movie: CheckInMovie }) {
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState(false);
  const [pending, startTransition] = useTransition();
  // Closing by any route but an answer means "still watching".
  const [answered, setAnswered] = useState(false);
  // Focus opens on the main choice, not the close button.
  const primary = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && !answered) void snoozeCheckIn(movie.tmdbId);
  };

  const finish = (feedback: Feedback) =>
    startTransition(async () => {
      const result = await rateMovie({ ...movie, signal: feedback });
      if (!result.ok) return;
      setAnswered(true);
      close();
      const answer = ANSWERS.find((a) => a.feedback === feedback);
      toast(answer?.ack ?? "Noted.", {
        description: `${answer?.label}: ${movie.title}`,
        action: {
          label: "Undo",
          onClick: () => void undoRating(movie.tmdbId).then((r) => (r.ok ? watchLater(movie.tmdbId) : r)),
        },
      });
    });

  const later = () =>
    startTransition(async () => {
      setAnswered(true);
      close();
      await snoozeCheckIn(movie.tmdbId);
    });

  const skipped = () =>
    startTransition(async () => {
      const result = await didntWatch(movie.tmdbId);
      if (!result.ok) return;
      setAnswered(true);
      close();
      toast("Still on your watchlist", { description: movie.title });
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={primary}
        className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none rounded-t-xl bg-background p-0 ring-1 ring-border max-sm:data-open:slide-in-from-bottom-10 max-sm:data-closed:slide-out-to-bottom-10 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(40rem,85dvh)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <header className="flex items-center gap-4 border-b border-border px-4 pt-4 pb-4 sm:px-5">
          <Poster path={movie.posterPath} title={movie.title} size="w185" sizes="56px" className="w-14 shrink-0 rounded-lg shadow-glow" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-display-sm text-balance text-ink-strong">
              {rating ? `How was ${movie.title}?` : `Did you finish ${movie.title}?`}
            </DialogTitle>
            <DialogDescription className="text-body-sm text-body">
              {movie.startedVia ? `You opened it on ${movie.startedVia}` : "You opened it to watch"}
              {movie.year ? ` · ${movie.year}` : ""}
            </DialogDescription>
          </div>
          <DialogClose render={<Button variant="ghost" size="icon-lg" className="-mr-2 self-start text-mute hover:text-ink" />}>
            <XIcon className="size-5" />
            <span className="sr-only">Close, ask me later</span>
          </DialogClose>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          <AnimatePresence initial={false} mode="wait">
            {rating ? (
              <motion.div
                key="answers"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex flex-col gap-2"
              >
                <ul className="flex flex-col gap-1.5" aria-label="How was it">
                  {ANSWERS.map(({ feedback, label, icon: Icon }) => (
                    <li key={feedback}>
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => finish(feedback)}
                        className={`h-12 w-full justify-start gap-3 px-3 text-body-md font-normal text-ink ${
                          feedback === "peak" ? "text-primary-soft hover:text-primary-soft" : ""
                        }`}
                      >
                        <Icon className="size-5" />
                        {label}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setRating(false)}
                  className="h-11 self-start px-2 text-body-sm text-body hover:text-ink"
                >
                  <ChevronLeftIcon />
                  Back
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="choices"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex flex-col gap-2"
              >
                <Button
                  ref={primary}
                  disabled={pending}
                  onClick={() => setRating(true)}
                  className="h-12 w-full justify-start gap-3 px-3 text-body-md font-semibold"
                >
                  <CheckIcon className="size-5" />
                  Finished it
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={later}
                  className="h-12 w-full justify-start gap-3 px-3 text-body-md font-normal text-ink"
                >
                  <ClockIcon className="size-5 text-mute" />
                  Still watching
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={skipped}
                  className="h-12 w-full justify-start gap-3 px-3 text-body-md font-normal text-ink"
                >
                  <UndoIcon className="size-5 text-mute" />
                  Didn’t watch it
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
