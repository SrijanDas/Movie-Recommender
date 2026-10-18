"use client";

import { BanIcon, BookmarkPlusIcon } from "lucide-react";
import Link from "next/link";
import type { Rating } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/recommend/types";

// Saving, removing and undo live in RecommendationList; the card only says
// which action was taken.
export function RecommendationCard({
  movie,
  preload,
  onRate,
  onWatchlist,
}: {
  movie: Recommendation;
  preload?: boolean;
  onRate: (rating: Rating) => void;
  onWatchlist: () => void;
}) {
  const because = movie.reasons.flatMap((r) => r.because);
  const becauseTitles = [...new Set(because)].slice(0, 2);

  return (
    <article className="group flex w-full flex-col gap-3">
      {/* Poster and title open the film's page in a new tab, so the list and its
          scroll position stay put; reasons and Seen it stay outside the link. */}
      <Link
        href={`/movie/${movie.tmdbId}`}
        target="_blank"
        rel="noopener"
        className="flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Poster
          path={movie.posterPath}
          title={movie.title}
          preload={preload}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
          className="transition-shadow duration-200 group-hover:shadow-glow"
        />
        <h3 className="text-body-md font-semibold leading-snug text-ink">
          {movie.title}{" "}
          {movie.year && <span className="font-mono text-code font-normal text-mute">{movie.year}</span>}
        </h3>
        <span className="sr-only">(opens in a new tab)</span>
      </Link>

      <div className="-mt-1 flex flex-col gap-2">
        {movie.reasons.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Why it was picked">
            {movie.reasons.map((r) => (
              <li key={r.text}>
                <Badge variant="outline" className="h-auto whitespace-normal px-2.5 py-1 text-left text-caption font-normal text-body">
                  {r.text}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {becauseTitles.length > 0 && (
          <p className="text-caption text-mute">Because you like {becauseTitles.join(" and ")}</p>
        )}
      </div>

      {/* One row: Seen it takes the room left by the two icon buttons. */}
      <div className="mt-auto flex items-center gap-1.5">
        <SeenItMenu title={movie.title} onRate={onRate} compact className="min-w-0 flex-1" />
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 text-body hover:text-primary-soft"
          aria-label={`Add ${movie.title} to your watchlist`}
          title="Add to watchlist"
          onClick={onWatchlist}
        >
          <BookmarkPlusIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 text-mute hover:text-ink"
          aria-label={`Not interested in ${movie.title}`}
          title="Not interested"
          onClick={() => onRate("down")}
        >
          <BanIcon />
        </Button>
      </div>
    </article>
  );
}
