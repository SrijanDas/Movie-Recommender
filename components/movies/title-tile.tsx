import Link from "next/link";
import type { SearchResult } from "@/app/actions";
import { FilmRating } from "@/components/movies/film-meta";
import { Poster } from "@/components/movies/poster";

export const TILE_GRID = "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-6";
export const TILE_SIZES = "(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw";

export const titleHref = (t: Pick<SearchResult, "tmdbId" | "kind">) =>
  t.kind === "series" ? `/series/${t.tmdbId}` : `/movie/${t.tmdbId}`;

// A poster that opens the film's or series' page, with its title, year and
// score.
export function TitleTile({
  title: t,
  preload,
  sizes = TILE_SIZES,
  note,
  className,
}: {
  title: SearchResult;
  preload?: boolean;
  sizes?: string;
  // A line under the title, e.g. the role on a person's page.
  note?: string;
  className?: string;
}) {
  return (
    <li className={className}>
      <Link
        href={titleHref(t)}
        className="group flex flex-col gap-1.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Poster
          path={t.posterPath}
          title={t.title}
          preload={preload}
          sizes={sizes}
          className="transition-shadow duration-150 group-hover:shadow-glow"
        />
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 text-caption leading-tight text-body group-hover:text-ink">{t.title}</span>
          {note && <span className="line-clamp-1 text-caption text-mute">{note}</span>}
          {(t.year || !!t.voteCount) && (
            <span className="flex items-center gap-1.5 font-mono text-caption text-mute">
              {t.year}
              {t.year && !!t.voteCount && <span aria-hidden>·</span>}
              <FilmRating average={t.voteAverage} count={t.voteCount} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

