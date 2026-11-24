import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";
import { HomeShelves, HomeShelvesSkeleton } from "@/components/movies/home-shelves";
import { Notice } from "@/components/movies/recommendation-grid";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getFirstRecommendations } from "@/lib/recommend";
import { isTmdbConfigured } from "@/lib/tmdb/client";

export const metadata: Metadata = { title: "Home" };

// Members land here: what's new and popular, films and series. Picks made
// for them live on their own tab (/for-you).
// Sideloads the For you tab: once Home has been sent, work out the first
// batch of picks so it's cached when the tab opens. Renders nothing.
async function WarmRecommendations() {
  const userId = await getCurrentUserId();
  if (!userId || !isTmdbConfigured()) return null;
  // Request data has to be read here: after() can't read cookies.
  const movies = await getUserMovies(userId);
  after(() => getFirstRecommendations(movies).catch((error) => console.error(error)));
  return null;
}

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-8 md:py-10">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">Home</h1>
      <Suspense fallback={null}>
        <WarmRecommendations />
      </Suspense>
      {isTmdbConfigured() ? (
        <Suspense fallback={<HomeShelvesSkeleton />}>
          <HomeShelves />
        </Suspense>
      ) : (
        <Notice
          title="The film database isn’t connected"
          body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
        />
      )}
    </section>
  );
}
