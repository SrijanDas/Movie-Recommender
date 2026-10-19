import type { Metadata } from "next";
import { Suspense } from "react";
import { searchMoviesAction } from "@/app/actions";
import { Notice } from "@/components/movies/recommendation-grid";
import { SearchView } from "@/components/movies/search-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { isInMyFilms } from "@/lib/movies/types";
import { getStarterMovies, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

export const metadata: Metadata = { title: "Search" };

async function Search({ q }: { q: string }) {
  if (!isTmdbConfigured()) {
    return (
      <Notice
        title="The film database isn’t connected"
        body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
      />
    );
  }
  const [starters, results, movies] = await Promise.all([
    getStarterMovies().catch(() => []),
    searchMoviesAction(q),
    requireUserId().then(getUserMovies),
  ]);
  return (
    <SearchView
      key={q}
      hide={movies.filter(isInMyFilms).map((m) => m.tmdbId)}
      starters={starters.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: releaseYear(m.release_date),
        posterPath: m.poster_path,
        voteAverage: m.vote_average,
        voteCount: m.vote_count,
      }))}
      initial={{ query: q, results }}
    />
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-3" aria-hidden>
      <Skeleton className="h-12 rounded-lg" />
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-2/3 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-5 pb-8 sm:px-6 md:py-10">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">Search</h1>
      <Suspense fallback={<SearchSkeleton />}>
        {searchParams.then(({ q }) => (
          <Search q={typeof q === "string" ? q.trim().slice(0, 100) : ""} />
        ))}
      </Suspense>
    </section>
  );
}
