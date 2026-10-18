import { PlayIcon, StarIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MovieVerdict } from "@/components/movies/movie-verdict";
import { Poster } from "@/components/movies/poster";
import { Notice } from "@/components/movies/recommendation-grid";
import { BackButton } from "@/components/site/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getMovie, getTrailerUrl, isTmdbConfigured } from "@/lib/tmdb/client";
import { profileUrl, releaseYear } from "@/lib/tmdb/images";

const CAST_SHOWN = 8;

function parseId(raw: string) {
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return id > 0 ? id : null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Headshot from TMDB, or the person's initials when TMDB has no photo.
function PersonAvatar({ name, path, className }: { name: string; path: string | null; className?: string }) {
  const src = profileUrl(path);
  return (
    <Avatar className={className ?? "size-12"}>
      {src && <AvatarImage src={src} alt="" loading="lazy" className="object-top" />}
      <AvatarFallback className="bg-canvas-soft text-caption font-medium text-mute">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function formatRuntime(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const movie = id && isTmdbConfigured() ? await getMovie(id) : null;
  if (!movie) return { title: "Film" };
  return { title: movie.title, description: movie.overview || undefined };
}

async function MovieDetails({ id: raw }: { id: string }) {
  if (!isTmdbConfigured()) {
    return (
      <Notice
        title="The film database isn’t connected"
        body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
      />
    );
  }
  const id = parseId(raw);
  const movie = id ? await getMovie(id) : null;
  if (!id || !movie) notFound();

  const [userId, trailer] = await Promise.all([getCurrentUserId(), getTrailerUrl(id).catch(() => null)]);
  const saved = userId ? ((await getUserMovies(userId)).find((m) => m.tmdbId === id)?.signal ?? null) : null;

  const year = releaseYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const directors = movie.credits.crew.filter((c) => c.job === "Director");
  const cast = [...movie.credits.cast].sort((a, b) => a.order - b.order).slice(0, CAST_SHOWN);
  const rated = movie.vote_count > 0;

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Poster
          path={movie.poster_path}
          title={movie.title}
          size="w500"
          sizes="(min-width: 640px) 240px, 50vw"
          preload
          className="w-1/2 max-w-60 shrink-0 self-start sm:w-60"
        />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display-md text-balance text-ink-strong md:text-display-lg">{movie.title}</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-code text-mute">
              {[year, runtime].filter(Boolean).join(" · ")}
              {rated && (
                <>
                  {(year || runtime) && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1" title={`${movie.vote_count.toLocaleString("en")} votes on TMDB`}>
                    <StarIcon className="size-3.5 text-primary-soft" aria-hidden />
                    <span className="sr-only">TMDB rating</span>
                    {movie.vote_average.toFixed(1)}
                  </span>
                </>
              )}
            </p>
            {directors.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-3" aria-label="Directed by">
                {directors.map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <PersonAvatar name={d.name} path={d.profile_path} />
                    <span className="flex flex-col">
                      <span className="text-caption text-mute">Director</span>
                      <span className="text-body-md font-semibold text-ink">{d.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <MovieVerdict
            tmdbId={id}
            snapshot={{ title: movie.title, posterPath: movie.poster_path, year }}
            signedIn={Boolean(userId)}
            saved={saved}
          />
          {movie.tagline && <p className="text-body-lg text-pretty text-ink">{movie.tagline}</p>}
          {movie.overview && <p className="max-w-prose text-body-md text-pretty text-body">{movie.overview}</p>}
          {movie.genres.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Genres">
              {movie.genres.map((g) => (
                <li key={g.id}>
                  <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-caption font-normal text-body">
                    {g.name}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {trailer && (
            <Button
              variant="ghostGreen"
              className="-ml-2 self-start px-2"
              render={<a href={trailer} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <PlayIcon />
              Watch the trailer
            </Button>
          )}
        </div>
      </div>

      {cast.length > 0 && (
        <section aria-labelledby="cast" className="flex flex-col gap-3">
          <h2 id="cast" className="text-display-sm text-ink">
            Cast
          </h2>
          <ul className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 sm:border-b-0">
            {cast.map((c) => (
              <li key={c.id} className="flex min-w-0 items-center gap-3 py-2.5 sm:border-b sm:border-border">
                <PersonAvatar name={c.name} path={c.profile_path} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-md text-ink">{c.name}</span>
                  {c.character && <span className="truncate text-body-sm text-mute">{c.character}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function MovieSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8" aria-hidden>
      <Skeleton className="aspect-2/3 w-1/2 max-w-60 rounded-xl sm:w-60" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-10 w-full sm:w-56" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export default function MoviePage({ params }: PageProps<"/movie/[id]">) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 md:py-8">
      <BackButton fallback="/recommendations" />
      <Suspense fallback={<MovieSkeleton />}>{params.then(({ id }) => <MovieDetails id={id} />)}</Suspense>
    </section>
  );
}
