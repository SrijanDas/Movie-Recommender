import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { searchMoviesAction } from "@/app/actions";
import { Notice } from "@/components/movies/recommendation-grid";
import { SearchView } from "@/components/movies/search-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getPopularPool, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

export const metadata: Metadata = { title: "Search" };

const POPULAR_COUNT = 30;

// A fresh random pick from the pool on every visit (Fisher–Yates).
function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

async function Search({ q }: { q: string }) {
  if (!isTmdbConfigured()) {
    return (
      <Notice
        title="The film database isn’t connected"
        body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
      />
    );
  }
  await connection();
  const [pool, results] = await Promise.all([getPopularPool().catch(() => []), searchMoviesAction(q)]);
  const starters = pickRandom(pool, POPULAR_COUNT);
  return (
    <SearchView
      key={q}
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
