import type { Metadata } from "next";
import { Suspense } from "react";
import { MyFilms } from "@/components/movies/my-films";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies, withScores } from "@/lib/movies/store";
import { getStarterResults } from "@/lib/movies/starters";
import { isMyFilmsFilter, type MyFilmsFilter } from "@/lib/movies/types";

export const metadata: Metadata = { title: "My films" };

// ?show= as MyFilms writes it ("favourites" for the favourites); All otherwise.
function parseShow(show: string | string[] | undefined): MyFilmsFilter {
  const value = Array.isArray(show) ? show[0] : show;
  if (value === "favourites") return "favorite";
  return value !== "favorite" && isMyFilmsFilter(value) ? value : "all";
}

async function Lists({ searchParams }: { searchParams: Promise<{ show?: string | string[]; q?: string | string[] }> }) {
  const { show, q } = await searchParams;
  const [movies, starters] = await Promise.all([
    getUserMovies(await requireUserId()).then(withScores),
    getStarterResults(),
  ]);
  return (
    <MyFilms
      movies={movies}
      initialFilter={parseShow(show)}
      initialQuery={(Array.isArray(q) ? q[0] : q) ?? ""}
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
