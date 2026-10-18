import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { FavoritesPicker } from "@/components/movies/favorites-picker";
import { PlainHeader } from "@/components/site/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies, withScores } from "@/lib/movies/store";
import { isOnboarded } from "@/lib/onboarding";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { getStarterMovies, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

export const metadata: Metadata = { title: "Pick films you love" };

// The first and only onboarding step. Once finished (setFavorites marks it),
// this page sends the user straight on; favourites are edited on My films.
async function Picker() {
  const userId = await requireUserId();
  const [onboarded, movies, starters] = await Promise.all([
    isOnboarded(userId),
    getUserMovies(userId),
    isTmdbConfigured() ? getStarterMovies().catch(() => []) : [],
  ]);
  if (onboarded) redirect("/recommendations");
  const saved = await withScores(favoritesInOrder(movies));
  return (
    <FavoritesPicker
      saved={saved.map(({ tmdbId, title, year, posterPath, voteAverage, voteCount }) => ({
        tmdbId,
        title,
        year,
        posterPath,
        voteAverage,
        voteCount,
      }))}
      starters={starters.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: releaseYear(m.release_date),
        posterPath: m.poster_path,
        voteAverage: m.vote_average,
        voteCount: m.vote_count,
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

export default function OnboardingPage() {
  return (
    <>
      <PlainHeader logoHref="/onboarding">
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="h-9 text-body-sm text-body">
            Sign out
          </Button>
        </form>
      </PlainHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-5 sm:px-6 md:pt-10">
        <Suspense fallback={<PickerSkeleton />}>
          <Picker />
        </Suspense>
      </main>
    </>
  );
}
