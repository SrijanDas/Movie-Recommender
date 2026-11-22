import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeShelves, HomeShelvesSkeleton } from "@/components/movies/home-shelves";
import { Notice } from "@/components/movies/recommendation-grid";
import { isTmdbConfigured } from "@/lib/tmdb/client";

export const metadata: Metadata = { title: "Home" };

// Members land here: what's new and popular, films and series. Picks made
// for them live on their own tab (/recommendations).
export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 md:gap-8 md:py-10">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">Home</h1>
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
