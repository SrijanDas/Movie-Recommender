import { SHELF } from "@/components/movies/title-page";
import { TitleTile, titleHref } from "@/components/movies/title-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeShelves } from "@/lib/tmdb/client";
import { movieResult, seriesResult } from "@/lib/tmdb/results";

const SHELF_SIZE = 15;

// The Home page: what's new and what everyone's watching, films and
// series, as sideways rows. Renders nothing when the movie database is down.
export async function HomeShelves() {
  const shelves = await getHomeShelves().catch(() => null);
  if (!shelves) return null;
  const rows = [
    { id: "new-films", title: "New films", titles: shelves.newMovies.map(movieResult) },
    { id: "new-series", title: "New episodes", titles: shelves.newSeries.map(seriesResult) },
    { id: "popular-films", title: "Popular films", titles: shelves.popularMovies.map(movieResult) },
    { id: "popular-series", title: "Popular series", titles: shelves.popularSeries.map(seriesResult) },
  ];
  return (
    <div className="flex flex-col gap-8">
      {rows.map(
        (row) =>
          row.titles.length > 0 && (
            <section key={row.id} aria-labelledby={row.id} className="flex flex-col gap-3">
              <h2 id={row.id} className="text-display-sm text-ink">
                {row.title}
              </h2>
              <ul className={SHELF}>
                {row.titles.slice(0, SHELF_SIZE).map((t) => (
                  <TitleTile key={titleHref(t)} title={t} sizes="(min-width: 640px) 128px, 104px" className="w-26 shrink-0 snap-start sm:w-32" />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}

export function HomeShelvesSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {Array.from({ length: 4 }, (_, row) => (
        <div key={row} className="flex flex-col gap-3">
          <Skeleton className="h-7 w-36" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex w-26 shrink-0 flex-col gap-1.5 sm:w-32">
                <Skeleton className="aspect-2/3 rounded-xl" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
