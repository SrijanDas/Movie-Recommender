import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The audience score out of 10, written the same everywhere a film is
// shown. Renders nothing when nobody has voted (or the score isn't known).
// `prominent` is the film page's version: a tag with a filled star and "/10".
export function FilmRating({
  average,
  count,
  prominent,
  className,
}: {
  average?: number;
  count?: number;
  prominent?: boolean;
  className?: string;
}) {
  if (!count || average === undefined) return null;
  const votes = `${count.toLocaleString("en")} ${count === 1 ? "vote" : "votes"}`;
  if (prominent) {
    return (
      <span
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-canvas-soft pr-3 pl-2.5 font-mono tabular-nums",
          className,
        )}
        title={votes}
      >
        <StarIcon className="size-4 fill-primary-soft text-primary-soft" aria-hidden />
        <span className="sr-only">Audience rating</span>
        <span className="text-body-md font-semibold text-ink-strong">{average.toFixed(1)}</span>
        <span className="-ml-1 text-caption text-mute">/10</span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={votes}>
      <StarIcon className="size-[1em] text-primary-soft" aria-hidden />
      <span className="sr-only">Audience rating</span>
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
