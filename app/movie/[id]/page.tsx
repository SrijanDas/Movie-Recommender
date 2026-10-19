import { PlayIcon } from "lucide-react";
import { FilmRating } from "@/components/movies/film-meta";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MovieVerdict } from "@/components/movies/movie-verdict";
import { Poster } from "@/components/movies/poster";
import { WhereToWatch } from "@/components/movies/where-to-watch";
import { Notice } from "@/components/movies/recommendation-grid";
import { BackButton } from "@/components/site/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getMovie, getTrailerUrl, isTmdbConfigured } from "@/lib/tmdb/client";
import { backdropUrl, profileUrl, releaseYear } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

const CAST_SHOWN = 8;

function parseId(raw: string) {
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return id > 0 ? id : null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// The banner's height; the poster rises into its faded lower edge.
const BANNER = "h-[clamp(12rem,34svh,26rem)]";

// The film's widest still, full-bleed under the header, fading into the page.
function Banner({ path }: { path: string | null }) {
  const src = backdropUrl(path);
  if (!src) return null;
  return (
    <div className={cn("relative w-full overflow-hidden bg-canvas", BANNER)}>
      <Image
        src={src}
        alt=""
        fill
        preload
        unoptimized
        sizes="100vw"
        className="object-cover object-[50%_25%] opacity-75 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      />
    </div>
  );
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
      <div className={cn(PAGE, "pt-16 md:pt-20")}>
        <Notice
          title="The film database isn’t connected"
          body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
        />
      </div>
    );
  }
  const id = parseId(raw);
  const movie = id ? await getMovie(id) : null;
  if (!id || !movie) notFound();

  // Signed-out visitors see the film without the actions (see layout.tsx).
  const [userId, trailer] = await Promise.all([getCurrentUserId(), getTrailerUrl(id).catch(() => null)]);
  const listed = userId ? (await getUserMovies(userId)).find((m) => m.tmdbId === id) : undefined;

  const year = releaseYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const directors = movie.credits.crew.filter((c) => c.job === "Director");
  const cast = [...movie.credits.cast].sort((a, b) => a.order - b.order).slice(0, CAST_SHOWN);
  const rated = movie.vote_count > 0;
  const banner = Boolean(movie.backdrop_path);

  return (
    <>
      <Banner path={movie.backdrop_path} />
      <article className={cn(PAGE, "flex flex-col gap-8 pb-8", banner ? "pt-0" : "pt-16 md:pt-20")}>
        {/* Phones: the poster rises into the banner. Wider: poster and title
            rise together, so their tops line up. */}
        <div className={cn("relative flex flex-col gap-6 sm:flex-row sm:gap-8", banner && "sm:-mt-24")}>
          <Poster
            path={movie.poster_path}
            title={movie.title}
            size="w500"
            sizes="(min-width: 640px) 240px, 50vw"
            preload
            className={cn(
              "relative w-1/2 max-w-60 shrink-0 self-start shadow-glow sm:w-60",
              banner && "-mt-28 sm:mt-0",
            )}
          />
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-display-md text-balance text-ink-strong md:text-display-lg">{movie.title}</h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-code text-mute">
                {[year, runtime].filter(Boolean).join(" · ")}
                {rated && (
                  <>
                    {(year || runtime) && <span aria-hidden>·</span>}
                    <FilmRating average={movie.vote_average} count={movie.vote_count} />
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
            {userId && (
              <MovieVerdict
                tmdbId={id}
                snapshot={{ title: movie.title, posterPath: movie.poster_path, year }}
                saved={listed?.signal ?? null}
                seenAnswer={listed?.seenSignal ?? null}
              />
            )}
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

        <Suspense fallback={<WhereToWatchSkeleton />}>
          <WhereToWatch tmdbId={id} title={movie.title} />
        </Suspense>

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
    </>
  );
}

function WhereToWatchSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-7 w-44" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-32 rounded-lg" />
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>
    </div>
  );
}

function MovieSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className={cn("w-full rounded-none", BANNER)} />
      <div className={cn(PAGE, "relative flex flex-col gap-6 sm:-mt-24 sm:flex-row sm:gap-8")}>
        <Skeleton className="-mt-28 aspect-2/3 w-1/2 max-w-60 rounded-xl sm:mt-0 sm:w-60" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full sm:w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

// The page column; the banner runs full-bleed above it.
const PAGE = "mx-auto w-full max-w-4xl px-4 sm:px-6";

export default function MoviePage({ params }: PageProps<"/movie/[id]">) {
  return (
    <section className="relative flex flex-col">
      {/* Floats over the banner's top edge. */}
      <div className={cn(PAGE, "absolute inset-x-0 top-0 z-10 pt-3 md:pt-5")}>
        {/* "/" sends members on to their picks (proxy.ts). */}
        <BackButton fallback="/" className="bg-canvas/70 backdrop-blur-sm" />
      </div>
      <Suspense fallback={<MovieSkeleton />}>{params.then(({ id }) => <MovieDetails id={id} />)}</Suspense>
    </section>
  );
}
