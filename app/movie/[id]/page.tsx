import { FilmRating } from "@/components/movies/film-meta";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BannerSlideshow } from "@/components/movies/banner-slideshow";
import { MovieVerdict } from "@/components/movies/movie-verdict";
import { Poster } from "@/components/movies/poster";
import { StillsGallery } from "@/components/movies/stills-gallery";
import { VideoPlayer } from "@/components/movies/video-player";
import { WhereToWatch } from "@/components/movies/where-to-watch";
import { Notice } from "@/components/movies/recommendation-grid";
import { BackButton } from "@/components/site/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getMovie, getMovieMedia, isTmdbConfigured, type MovieMedia } from "@/lib/tmdb/client";
import { profileUrl, releaseYear, titleLogoUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

const CAST_SHOWN = 15;

const NO_MEDIA: MovieMedia = { logo: null, stills: [], trailer: null, extras: [] };

// A row that scrolls sideways, bleeding to the screen edge on phones.
const SHELF =
  "-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6";

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

// The film's stills, full-bleed under the header, looping and fading into
// the page. Starts on its main backdrop.
function Banner({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div className={cn("relative w-full overflow-hidden bg-canvas", BANNER)}>
      <BannerSlideshow paths={paths} />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-display-sm text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

// The film's title logo when it has one, as most posters set it; the plain
// title otherwise. Screen readers always get the text.
function Title({ title, logo }: { title: string; logo: MovieMedia["logo"] }) {
  if (!logo) return <h1 className="text-display-md text-balance text-ink-strong md:text-display-lg">{title}</h1>;
  return (
    <h1 className="pb-1">
      <span className="sr-only">{title}</span>
      <Image
        src={titleLogoUrl(logo.file_path)}
        alt=""
        aria-hidden
        width={logo.width}
        height={logo.height}
        preload
        unoptimized
        className="h-auto max-h-24 w-auto max-w-[min(100%,20rem)] object-contain object-left sm:max-h-28 sm:max-w-[min(100%,24rem)]"
      />
    </h1>
  );
}

// One cast member: a portrait headshot, or their initials when there's none.
function CastCard({ name, character, path }: { name: string; character: string; path: string | null }) {
  const src = profileUrl(path);
  return (
    <li className="w-28 shrink-0 snap-start">
      <div className="relative flex aspect-2/3 items-center justify-center overflow-hidden rounded-xl border border-border bg-canvas-soft">
        {src ? (
          <Image src={src} alt="" fill unoptimized loading="lazy" sizes="112px" className="object-cover object-top" />
        ) : (
          <span aria-hidden className="text-display-sm text-mute">
            {initials(name)}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-caption font-medium text-ink">{name}</p>
      {character && <p className="line-clamp-2 text-caption text-mute">{character}</p>}
    </li>
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
  const [userId, media] = await Promise.all([
    getCurrentUserId(),
    getMovieMedia(id).catch(() => NO_MEDIA),
  ]);
  const listed = userId ? (await getUserMovies(userId)).find((m) => m.tmdbId === id) : undefined;

  const year = releaseYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const directors = movie.credits.crew.filter((c) => c.job === "Director");
  const cast = [...movie.credits.cast].sort((a, b) => a.order - b.order).slice(0, CAST_SHOWN);
  const rated = movie.vote_count > 0;
  // The main backdrop first, then the other stills (at most 8 in the loop).
  const bannerPaths = [
    ...new Set([movie.backdrop_path, ...media.stills.map((s) => s.file_path)].filter((p): p is string => !!p)),
  ].slice(0, 8);
  const banner = bannerPaths.length > 0;

  return (
    <>
      <Banner paths={bannerPaths} />
      <article className={cn(PAGE, "flex flex-col gap-10 pb-10", banner ? "pt-0" : "pt-16 md:pt-20")}>
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
              <Title title={movie.title} logo={media.logo} />
              {(rated || year || runtime) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {rated && <FilmRating average={movie.vote_average} count={movie.vote_count} prominent />}
                  {(year || runtime) && (
                    <p className="font-mono text-code text-mute">{[year, runtime].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              )}
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
          </div>
        </div>

        <Suspense fallback={<WhereToWatchSkeleton />}>
          <WhereToWatch tmdbId={id} title={movie.title} />
        </Suspense>

        {media.trailer && (
          <Section id="trailer" title="Trailer">
            <VideoPlayer
              videoKey={media.trailer.key}
              label={`Trailer for ${movie.title}`}
              sizes="(min-width: 896px) 848px, 100vw"
              large
            />
          </Section>
        )}

        {media.stills.length > 0 && (
          <Section id="stills" title="Stills">
            <StillsGallery paths={media.stills.map((s) => s.file_path)} title={movie.title} />
          </Section>
        )}

        {cast.length > 0 && (
          <Section id="cast" title="Cast">
            <ul className={SHELF}>
              {cast.map((c) => (
                <CastCard key={c.id} name={c.name} character={c.character} path={c.profile_path} />
              ))}
            </ul>
          </Section>
        )}

        {media.extras.length > 0 && (
          <Section id="extras" title="Clips and extras">
            <ul className={SHELF}>
              {media.extras.map((v) => (
                <li key={v.key} className="flex w-64 shrink-0 snap-start flex-col gap-2 sm:w-72">
                  <VideoPlayer videoKey={v.key} label={v.name} sizes="288px" />
                  <p className="line-clamp-2 text-caption font-medium text-ink">{v.name}</p>
                  <p className="-mt-2 text-caption text-mute">{v.type}</p>
                </li>
              ))}
            </ul>
          </Section>
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
