import type { Metadata } from "next";
import { Suspense } from "react";
import { MyFilms } from "@/components/movies/my-films";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies, withScores } from "@/lib/movies/store";
import { getStarterResults } from "@/lib/movies/starters";

export const metadata: Metadata = { title: "My films" };

async function Lists({ searchParams }: { searchParams: Promise<{ show?: string | string[] }> }) {
  const { show } = await searchParams;
  const [movies, starters] = await Promise.all([
    getUserMovies(await requireUserId()).then(withScores),
    getStarterResults(),
  ]);
  return (
    <MyFilms
      movies={movies}
      initialFilter={show === "favourites" ? "favorite" : "all"}
      starters={starters}
    />
  );
}

export default function MyMoviesPage({ searchParams }: PageProps<"/my-movies">) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col px-4 pt-5 pb-8 sm:px-6 md:py-10">
      {/* The header lives in MyFilms: its subtitle follows the selected filter. */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-5 md:gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-display-md text-ink-strong md:text-display-lg">My films</h1>
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-11" aria-hidden />
            <Skeleton className="h-64" aria-hidden />
          </div>
        }
      >
        <Lists searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
