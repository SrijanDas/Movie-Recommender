import type { Metadata } from "next";
import { Suspense } from "react";
import { GRID } from "@/components/movies/recommendation-grid";
import { WatchlistGrid } from "@/components/movies/watchlist-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";

export const metadata: Metadata = { title: "Watchlist" };

async function Saved() {
  const movies = await getUserMovies(await requireUserId());
  // Newest first.
  return <WatchlistGrid movies={movies.filter((m) => m.signal === "watchlist").reverse()} />;
}

export default function WatchlistPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-8 md:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">Watchlist</h1>
        <p className="max-w-xl text-body-sm text-body md:text-body-md">
          Films you’ve saved for later. Once you’ve watched one, say how it was.
        </p>
      </div>
      <Suspense
        fallback={
          <ul className={GRID} aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-2/3 rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-10" />
              </li>
            ))}
          </ul>
        }
      >
        <Saved />
      </Suspense>
    </section>
  );
}
