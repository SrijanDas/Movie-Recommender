import type { Metadata } from "next";
import { Suspense } from "react";
import { FilmSearch } from "@/components/movies/film-search";
import {
  NeedMoreNotice,
  Notice,
  RanOutNotice,
  RecommendationSkeleton,
} from "@/components/movies/recommendation-grid";
import { RecommendationList } from "@/components/movies/recommendation-list";
import { requireUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getRecommendations } from "@/lib/recommend";
import { MIN_FAVORITES } from "@/lib/recommend/types";
import { isTmdbConfigured } from "@/lib/tmdb/client";

export const metadata: Metadata = { title: "What to watch" };

async function Results() {
  if (!isTmdbConfigured()) {
    return (
      <Notice
        title="The film database isn’t connected"
        body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
      />
    );
  }

  const movies = await getUserMovies(await requireUserId());
  const loved = movies.filter((m) => m.signal === "favorite" || m.signal === "liked" || m.signal === "peak" || m.signal === "up").length;
  if (loved < MIN_FAVORITES) return <NeedMoreNotice loved={loved} min={MIN_FAVORITES} />;

  const recommendations = await getRecommendations(movies);
  if (recommendations.length === 0) return <RanOutNotice />;
  return <RecommendationList recommendations={recommendations} />;
}

export default function RecommendationsPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-display-md text-ink-strong md:text-display-lg">What to watch next</h1>
          <p className="max-w-xl text-body-sm text-body md:text-body-md">
            Matched to the films you love. Tell us how the ones you’ve seen were and the next batch gets sharper.
          </p>
        </div>
        <div className="w-full md:max-w-sm">
          <FilmSearch />
        </div>
      </div>
      <Suspense fallback={<RecommendationSkeleton />}>
        <Results />
      </Suspense>
    </section>
  );
}
