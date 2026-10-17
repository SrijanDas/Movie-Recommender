"use client";

import { Loader2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { forgetMovie, likeMovie } from "@/components/movies/movie-actions";
import { MovieSearch } from "@/components/movies/movie-search";
import { Poster } from "@/components/movies/poster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalMovies } from "@/lib/movies/local";
import { GUEST_MOVIE_LIMIT, type UserMovie } from "@/lib/movies/types";
import type { Signal } from "@/lib/recommend/types";

const SECTIONS: { signals: Signal[]; title: string; empty: string }[] = [
  {
    signals: ["favorite"],
    title: "Favourites",
    empty: "The films you picked on the home screen. They count most toward your taste.",
  },
  {
    signals: ["liked", "up"],
    title: "Also love",
    empty: "Films you add here, or give a thumbs up, count toward your taste too.",
  },
  {
    signals: ["down"],
    title: "Not for me",
    empty: "Thumbs-down a recommendation and it lands here. Similar films rank lower.",
  },
  {
    signals: ["seen"],
    title: "Seen it",
    empty: "Hidden from recommendations. They don’t affect your taste.",
  },
];

function Row({ movie, signedIn }: { movie: UserMovie; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Poster path={movie.posterPath} title={movie.title} size="w92" sizes="40px" className="w-10 shrink-0 rounded-sm" />
      <p className="min-w-0 flex-1">
        <span className="block truncate text-body-md text-ink">{movie.title}</span>
        <span className="text-caption text-mute">{movie.year ?? ""}</span>
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${movie.title}`}
        disabled={pending}
        onClick={() => startTransition(async () => void (await forgetMovie(signedIn, movie.tmdbId)))}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
      </Button>
    </li>
  );
}

function GuestUsage({ count }: { count: number }) {
  const full = count >= GUEST_MOVIE_LIMIT;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-body">Saved on this device</span>
        <span className="font-mono text-code text-ink">
          {count}/{GUEST_MOVIE_LIMIT}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={full ? "h-full bg-primary-soft" : "h-full bg-body"}
          style={{ width: `${Math.min(100, (count / GUEST_MOVIE_LIMIT) * 100)}%` }}
        />
      </div>
      <p className="text-body-sm text-mute">
        {full ? "This device is full. " : ""}
        <Link href="/sign-in" className="font-semibold text-primary-soft underline">
          Sign in
        </Link>{" "}
        to sync your films to all your devices and save more than {GUEST_MOVIE_LIMIT}.
      </p>
    </div>
  );
}

export function MyFilms({ signedIn, saved }: { signedIn: boolean; saved: UserMovie[] }) {
  const local = useLocalMovies();
  const [, startTransition] = useTransition();

  if (!signedIn && local === null) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-11" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const movies = signedIn ? saved : (local ?? []);
  const known = new Set(movies.map((m) => m.tmdbId));

  return (
    <div className="flex flex-col gap-8">
      {!signedIn && <GuestUsage count={movies.length} />}
      <MovieSearch
        size="md"
        label="Add a film you like"
        placeholder="Add a film you like"
        disabledReason={(m) => (known.has(m.tmdbId) ? "In your list" : null)}
        onPick={(movie) =>
          startTransition(async () => {
            const result = await likeMovie(signedIn, { ...movie, signal: "liked" });
            if (result.ok) toast.success(`Added ${movie.title}`);
          })
        }
      />
      {SECTIONS.map((section) => {
        const rows = movies.filter((m) => section.signals.includes(m.signal)).reverse();
        return (
          <section key={section.title} aria-label={section.title} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-display-sm text-ink">
                {section.title} <span className="text-body-sm font-normal text-mute">{rows.length}</span>
              </h2>
              {section.signals.includes("favorite") && (
                <Button variant="ghostGreen" size="sm" className="h-8" render={<Link href="/" />} nativeButton={false}>
                  Edit
                </Button>
              )}
            </div>
            {rows.length ? (
              <ul className="divide-y divide-border border-y border-border">
                {rows.map((m) => (
                  <Row key={m.tmdbId} movie={m} signedIn={signedIn} />
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-mute">{section.empty}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
