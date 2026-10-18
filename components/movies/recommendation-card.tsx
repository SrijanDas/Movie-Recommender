"use client";

import { BanIcon, BookmarkPlusIcon, ClockIcon, EllipsisVerticalIcon } from "lucide-react";
import Link from "next/link";
import { FilmCardHeading } from "@/components/movies/film-meta";
import type { Rating } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { SeenItMenu } from "@/components/movies/seen-it-menu";
import { useInstallState } from "@/components/site/pwa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // An installed PWA has no tabs: a new tab is a cold-started window with the
  // splash screen, so there the film opens in place and Back restores the list.
  const newTab = useInstallState() !== "installed";

  return (
    <article className="group relative flex w-full flex-col gap-3">
      {/* Poster and title open the film's page in a new tab (in the browser), so
          the list and its scroll position stay put; reasons and Seen it stay
          outside the link. */}
      <Link
        href={`/movie/${movie.tmdbId}`}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener" : undefined}
        className="flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Poster
          path={movie.posterPath}
          title={movie.title}
          preload={preload}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
          className="transition-shadow duration-200 group-hover:shadow-glow"
        />
        <FilmCardHeading
          title={movie.title}
          year={movie.year}
          voteAverage={movie.voteAverage}
          voteCount={movie.voteCount}
        />
        {newTab && <span className="sr-only">(opens in a new tab)</span>}
      </Link>

      {/* Sits over the poster's top-right corner, outside the link. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 size-9 rounded-full bg-canvas/70 text-ink backdrop-blur-sm hover:bg-canvas/90 hover:text-ink-strong aria-expanded:bg-canvas/90"
              aria-label={`More options for ${movie.title}`}
            />
          }
        >
          <EllipsisVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className="h-10 gap-2.5 px-2 text-body-sm text-ink" onClick={() => onRate("down")}>
            <BanIcon />
            Not interested
          </DropdownMenuItem>
          <DropdownMenuItem className="h-10 gap-2.5 px-2 text-body-sm text-ink" onClick={() => onRate("someday")}>
            <ClockIcon />
            Might watch someday
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

      {/* One row: Seen it takes the room left by the bookmark. */}
      <div className="mt-auto flex items-center gap-1.5">
        <SeenItMenu title={movie.title} onRate={onRate} variant="compact" className="min-w-0 flex-1" />
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
      </div>
    </article>
  );
}
