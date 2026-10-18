import Link from "next/link";
import { FilmRating } from "@/components/movies/film-meta";
import { Poster } from "@/components/movies/poster";
import type { ListedMovie } from "@/lib/movies/types";
import { cn } from "@/lib/utils";

export const rankClass = "w-4 shrink-0 text-center font-mono text-code text-mute tabular-nums";

// One film in a My films list: poster, title, year and rating, with an
// optional lead (rank, grip) and trailing actions.
export function FilmRow({
  movie,
  linked = true,
  lead,
  meta,
  children,
  ref,
  style,
  className,
}: {
  movie: ListedMovie;
  // Off while editing, so a stray tap mid-drag never navigates away.
  linked?: boolean;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLLIElement>;
  style?: React.CSSProperties;
  className?: string;
}) {
  const details = (
    <>
      <Poster path={movie.posterPath} title={movie.title} size="w92" sizes="40px" className="w-10 shrink-0 rounded-sm" />
      <p className="min-w-0 flex-1">
        <span className="block truncate text-body-md text-ink group-hover:text-primary-soft">{movie.title}</span>
        <span className="flex items-center gap-1.5 text-caption text-mute">
          {[
            movie.year,
            movie.voteCount ? <FilmRating key="rating" average={movie.voteAverage} count={movie.voteCount} /> : null,
            meta,
          ]
            .filter(Boolean)
            .flatMap((part, i) => (i > 0 ? [<span key={`dot-${i}`} aria-hidden>·</span>, part] : [part]))}
        </span>
      </p>
    </>
  );
  return (
    <li ref={ref} style={style} className={cn("flex items-center gap-3 py-2.5", className)}>
      {lead}
      {linked ? (
        <Link
          href={`/movie/${movie.tmdbId}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {details}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{details}</div>
      )}
      {children && <span className="flex shrink-0 items-center gap-0.5">{children}</span>}
    </li>
  );
}
