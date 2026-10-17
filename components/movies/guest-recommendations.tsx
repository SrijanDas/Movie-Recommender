"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { recommendFor } from "@/app/actions";
import {
  Notice,
  NeedMoreNotice,
  RanOutNotice,
  RecommendationGrid,
  RecommendationSkeleton,
} from "@/components/movies/recommendation-grid";
import { useLocalMovies } from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT } from "@/lib/movies/types";
import { MIN_FAVORITES, type Recommendation } from "@/lib/recommend/types";

type Result = { key: string } & ({ ok: true; recommendations: Recommendation[] } | { ok: false; error: string });

// Guests' lists live in localStorage, so the browser sends the list and the
// server returns recommendations. Any change to the list refetches.
export function GuestRecommendations() {
  const stored = useLocalMovies();
  const hydrated = stored !== null;
  const movies = useMemo(() => stored ?? [], [stored]);
  const rated = useMemo(() => movies.map(({ tmdbId, signal }) => ({ tmdbId, signal })), [movies]);
  const key = JSON.stringify(rated);
  const loved = movies.filter((m) => m.signal === "favorite" || m.signal === "liked" || m.signal === "up").length;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!hydrated || loved < MIN_FAVORITES) return;
    let cancelled = false;
    recommendFor(rated).then((r) => {
      if (!cancelled) setResult({ key, ...r });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, key, loved, rated]);

  if (!hydrated) return <RecommendationSkeleton />;
  if (loved < MIN_FAVORITES) return <NeedMoreNotice loved={loved} min={MIN_FAVORITES} />;
  // Keep showing the last list while a refetch runs, minus anything rated since.
  if (!result) return <RecommendationSkeleton />;
  if (!result.ok) return <Notice title="Couldn’t load recommendations" body={result.error} />;

  const ratedIds = new Set(movies.map((m) => m.tmdbId));
  const shown = result.recommendations.filter((r) => !ratedIds.has(r.tmdbId));
  const refreshing = result.key !== key;

  return (
    <div className="flex flex-col gap-6" aria-busy={refreshing}>
      <p className="text-body-sm text-mute">
        Saved on this device only ({movies.length} of {GUEST_MOVIE_LIMIT} films).{" "}
        <Link href="/sign-in" className="font-semibold text-primary-soft underline">
          Sign in to sync across devices and save more
        </Link>
      </p>
      {shown.length === 0 && !refreshing ? (
        <RanOutNotice />
      ) : (
        <RecommendationGrid recommendations={shown} signedIn={false} />
      )}
    </div>
  );
}
