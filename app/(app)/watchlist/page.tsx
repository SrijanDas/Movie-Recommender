import { ChevronRightIcon, ClockIcon, Share2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GRID } from "@/components/movies/recommendation-grid";
import { WatchlistGrid } from "@/components/movies/watchlist-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies, withScores } from "@/lib/movies/store";

export const metadata: Metadata = { title: "Watchlist" };

async function Saved() {
  const movies = await getUserMovies(await requireUserId());
  // Newest first.
  const saved = await withScores(movies.filter((m) => m.signal === "watchlist").reverse());
  return <WatchlistGrid movies={saved} />;
}

export default function WatchlistPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-8 md:py-10">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-display-md text-ink-strong md:text-display-lg">Watchlist</h1>
          <p className="max-w-xl text-body-sm text-body md:text-body-md">
            Films you’ve saved for later. Once you’ve watched one, say how it was.
          </p>
          {/* The films set aside for another time live on My films. */}
          <Link
            href="/my-movies?show=someday"
            className="-ml-1 flex w-fit items-center gap-1.5 rounded-md px-1 py-1.5 text-body-sm text-body outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ClockIcon className="size-4 text-mute" aria-hidden />
            Might watch someday
            <ChevronRightIcon className="size-4 text-mute" aria-hidden />
          </Link>
        </div>
        {/* Turns the watchlist into a named list to share. */}
        <Button
          variant="outline"
          className="h-10 shrink-0 px-3 text-body-sm"
          render={<Link href="/lists/new?from=watchlist" />}
          nativeButton={false}
        >
          <Share2Icon />
          Share
        </Button>
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
