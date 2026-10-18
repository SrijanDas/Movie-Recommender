import type { Metadata } from "next";
import { Suspense } from "react";
import { MyFilms } from "@/components/movies/my-films";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";

export const metadata: Metadata = { title: "My films" };

async function Lists() {
  return <MyFilms movies={await getUserMovies(await requireUserId())} />;
}

export default function MyMoviesPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-6 md:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">My films</h1>
        <p className="text-body-sm text-body md:text-body-md">Everything that shapes your recommendations.</p>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden>
            <Skeleton className="h-11" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <Lists />
      </Suspense>
    </section>
  );
}
