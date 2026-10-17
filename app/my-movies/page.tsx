import type { Metadata } from "next";
import { Suspense } from "react";
import { MyFilms } from "@/components/movies/my-films";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";

export const metadata: Metadata = { title: "My films" };

async function Lists() {
  const userId = await getCurrentUserId();
  const saved = userId ? await getUserMovies(userId) : [];
  return <MyFilms signedIn={Boolean(userId)} saved={saved} />;
}

export default function MyMoviesPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">My films</h1>
        <p className="text-body-md text-body">Everything that shapes your recommendations.</p>
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
