"use client";

import { BookmarkXIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ANSWERS } from "@/components/movies/feedback";
import { forgetMovie, rateMovie, undoRating, watchLater, type Feedback } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { GRID } from "@/components/movies/recommendation-grid";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Button } from "@/components/ui/button";
import type { UserMovie } from "@/lib/movies/types";

// Saved-for-later films. Saying how one was (it moves to My films → Seen it)
// or removing it takes the card away at once, with Undo.
export function WatchlistGrid({ movies }: { movies: UserMovie[] }) {
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const setShown = (id: number, shown: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (shown) next.delete(id);
      else next.add(id);
      return next;
    });

  // Undo puts the film back on the watchlist.
  const restore = (tmdbId: number) =>
    void undoRating(tmdbId)
      .then((r) => (r.ok ? watchLater(tmdbId) : r))
      .then((r) => r.ok && setShown(tmdbId, true));

  async function rate(movie: UserMovie, feedback: Feedback) {
    setShown(movie.tmdbId, false);
    const result = await rateMovie({ ...movie, signal: feedback });
    if (!result.ok) return setShown(movie.tmdbId, true);
    const answer = ANSWERS.find((a) => a.feedback === feedback);
    toast(answer?.ack ?? "Noted.", {
      description: `${answer?.label}: ${movie.title}`,
      action: { label: "Undo", onClick: () => restore(movie.tmdbId) },
    });
  }

  async function remove(movie: UserMovie) {
    setShown(movie.tmdbId, false);
    const result = await forgetMovie(movie.tmdbId);
    if (!result.ok) return setShown(movie.tmdbId, true);
    toast("Removed from your watchlist", {
      description: movie.title,
      action: {
        label: "Undo",
        onClick: () => void watchLater(movie.tmdbId).then((r) => r.ok && setShown(movie.tmdbId, true)),
      },
    });
  }

  const shown = movies.filter((m) => !hidden.has(m.tmdbId));

  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-muted p-5 sm:p-8">
        <h2 className="text-display-sm text-ink">Nothing saved yet</h2>
        <p className="max-w-prose text-body-md text-body">
          Tap the bookmark on a recommendation, or on any film’s page, to keep it here for movie night.
        </p>
        <Button render={<Link href="/recommendations" />} nativeButton={false}>
          See what to watch
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-mute" aria-live="polite">
        {shown.length} {shown.length === 1 ? "film" : "films"} to watch
      </p>
      <ul className={GRID}>
        {shown.map((movie, i) => (
          <li key={movie.tmdbId} className="flex">
            <article className="group flex w-full flex-col gap-3">
              <Link
                href={`/movie/${movie.tmdbId}`}
                className="flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Poster
                  path={movie.posterPath}
                  title={movie.title}
                  preload={i < 4}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
                  className="transition-shadow duration-200 group-hover:shadow-glow"
                />
                <h3 className="text-body-md font-semibold leading-snug text-ink">
                  {movie.title}{" "}
                  {movie.year && <span className="font-mono text-code font-normal text-mute">{movie.year}</span>}
                </h3>
              </Link>
              <div className="mt-auto flex items-center gap-1.5">
                <SeenItMenu title={movie.title} onRate={(f) => void rate(movie, f)} compact className="min-w-0 flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 text-mute hover:text-ink"
                  aria-label={`Remove ${movie.title} from your watchlist`}
                  title="Remove from watchlist"
                  onClick={() => void remove(movie)}
                >
                  <BookmarkXIcon />
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
