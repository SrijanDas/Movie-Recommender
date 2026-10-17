import { Suspense } from "react";
import { FavoritesPicker } from "@/components/movies/favorites-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getStarterMovies, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

async function Picker() {
  // Reading the session touches cookies, so everything below runs at request
  // time and the build never depends on TMDB being reachable.
  const userId = await getCurrentUserId();
  const [movies, starters] = await Promise.all([
    userId ? getUserMovies(userId) : [],
    isTmdbConfigured() ? getStarterMovies().catch(() => []) : [],
  ]);
  return (
    <FavoritesPicker
      signedIn={Boolean(userId)}
      saved={movies
        .filter((m) => m.signal === "favorite")
        .map(({ tmdbId, title, year, posterPath }) => ({ tmdbId, title, year, posterPath }))}
      starters={starters.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: releaseYear(m.release_date),
        posterPath: m.poster_path,
      }))}
    />
  );
}

function PickerSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full max-w-sm" />
      <Skeleton className="h-11 w-full" />
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-2/3 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 md:pt-10">
      <Suspense fallback={<PickerSkeleton />}>
        <Picker />
      </Suspense>
    </section>
  );
}
