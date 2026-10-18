import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// TMDB's audience score out of 10, written the same everywhere a film is
// shown. Renders nothing when nobody has voted (or the score isn't known).
export function FilmRating({
  average,
  count,
  className,
}: {
  average?: number;
  count?: number;
  className?: string;
}) {
  if (!count || average === undefined) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={`${count.toLocaleString("en")} votes on TMDB`}>
      <StarIcon className="size-[1em] text-primary-soft" aria-hidden />
      <span className="sr-only">TMDB rating</span>
      {average.toFixed(1)}
    </span>
  );
}

// Title, then "2021 · ★ 7.8" under it: the poster cards on Watch and Watchlist.
export function FilmCardHeading({
  title,
  year,
  voteAverage,
  voteCount,
}: {
  title: string;
  year: number | null;
  voteAverage?: number;
  voteCount?: number;
}) {
  const rated = !!voteCount && voteAverage !== undefined;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-body-md font-semibold leading-snug text-ink">{title}</h3>
      {(year || rated) && (
        <p className="flex items-center gap-x-2 font-mono text-code text-mute">
          {year}
          {year && rated && <span aria-hidden>·</span>}
          <FilmRating average={voteAverage} count={voteCount} />
        </p>
      )}
    </div>
  );
}
