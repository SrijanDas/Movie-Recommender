"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { recommendFor } from "@/app/actions";
import {
  Notice,
  NeedMoreNotice,
  RanOutNotice,
  RecommendationSkeleton,
} from "@/components/movies/recommendation-grid";
import { RecommendationList } from "@/components/movies/recommendation-list";
import { Button } from "@/components/ui/button";
import { useLocalMovies } from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT } from "@/lib/movies/types";
import { MIN_FAVORITES, type Recommendation } from "@/lib/recommend/types";

type Result = { request: number } & ({ ok: true; recommendations: Recommendation[] } | { ok: false; error: string });

// Guests' lists live in localStorage, so the browser sends the list and the
// server returns recommendations. Fetched once, then only on Refresh: rating a
// card removes just that card (RecommendationList, plus the filter below).
export function GuestRecommendations() {
  const stored = useLocalMovies();
  const hydrated = stored !== null;
  const movies = useMemo(() => stored ?? [], [stored]);
  const rated = useMemo(() => movies.map(({ tmdbId, signal, rank }) => ({ tmdbId, signal, rank: rank ?? null })), [movies]);
  const loved = movies.filter((m) => m.signal === "favorite" || m.signal === "liked" || m.signal === "up").length;
  const enough = loved >= MIN_FAVORITES;
  const [result, setResult] = useState<Result | null>(null);
  const [request, setRequest] = useState(0); // bumped by Refresh

  // The list as of now, read when a fetch starts, so list changes alone
  // don't refetch.
  const ratedNow = useRef(rated);
  useEffect(() => {
    ratedNow.current = rated;
  }, [rated]);

  useEffect(() => {
    if (!hydrated || !enough) return;
    let cancelled = false;
    recommendFor(ratedNow.current).then((r) => {
      if (!cancelled) setResult({ request, ...r });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, enough, request]);

  const refresh = () => setRequest((n) => n + 1);

  if (!hydrated) return <RecommendationSkeleton />;
  if (!enough) return <NeedMoreNotice loved={loved} min={MIN_FAVORITES} />;
  if (!result) return <RecommendationSkeleton />;
  const refreshing = result.request !== request;
  if (!result.ok) {
    return (
      <Notice
        title="Couldn’t load recommendations"
        body={result.error}
        action={
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            Try again
          </Button>
        }
      />
    );
  }

  // Keep showing this list while a refresh runs, minus anything rated since
  // (here or on a film's page).
  const ratedIds = new Set(movies.map((m) => m.tmdbId));
  const shown = result.recommendations.filter((r) => !ratedIds.has(r.tmdbId));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-mute">
        Saved on this device only ({movies.length} of {GUEST_MOVIE_LIMIT} films).{" "}
        <Link href="/sign-in" className="font-semibold text-primary-soft underline">
          Sign in to sync across devices and save more
        </Link>
      </p>
      {result.recommendations.length === 0 ? (
        <RanOutNotice />
      ) : (
        <RecommendationList recommendations={shown} signedIn={false} onRefresh={refresh} refreshing={refreshing} />
      )}
    </div>
  );
}
