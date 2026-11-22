import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BannerSlideshow } from "@/components/movies/banner-slideshow";
import { FilmRating } from "@/components/movies/film-meta";
import { LoadingImage } from "@/components/movies/loading-image";
import { Poster } from "@/components/movies/poster";
import { Notice } from "@/components/movies/recommendation-grid";
import { StillsGallery } from "@/components/movies/stills-gallery";
import { VideoPlayer } from "@/components/movies/video-player";
import { WhereToWatch } from "@/components/movies/where-to-watch";
import { BackButton } from "@/components/site/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovieMedia, TitleKind } from "@/lib/tmdb/client";
import { profileUrl, titleLogoUrl } from "@/lib/tmdb/images";
import type { TmdbCastMember, TmdbGenre } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils";

// The film and series pages share this layout; the person page shares its
// column, shelf and skeleton.

export const NO_MEDIA: MovieMedia = { logo: null, stills: [], trailer: null, extras: [] };

// The page column; the banner runs full-bleed above it.
export const PAGE = "mx-auto w-full max-w-4xl px-4 sm:px-6";

// A row that scrolls sideways, bleeding to the screen edge on phones.
// `relative` makes the row the containing block for absolutely placed
// children (sr-only text), so they're clipped by it instead of widening the page.
export const SHELF =
  "relative -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6";

const CAST_SHOWN = 15;

export function parseId(raw: string) {
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return id > 0 ? id : null;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function NotConnected() {
  return (
    <div className={cn(PAGE, "pt-16 md:pt-20")}>
      <Notice
        title="The film database isn’t connected"
        body="Set TMDB_API_TOKEN in .env.local to your TMDB API read access token, then restart the server."
      />
    </div>
  );
}

// The banner's height; the poster rises into its faded lower edge.
const BANNER = "h-[clamp(12rem,34svh,26rem)]";

// The stills, full-bleed under the header, looping and fading into the
// page. Starts on the main backdrop.
function Banner({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div className={cn("relative w-full overflow-hidden bg-canvas", BANNER)}>
      <BannerSlideshow paths={paths} />
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-display-sm text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

// The title logo when there is one, as most posters set it; the plain
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

// One cast member: a portrait headshot (or their initials), opening their page.
function CastCard({ id, name, character, path }: { id: number; name: string; character: string; path: string | null }) {
  const src = profileUrl(path);
  return (
    <li className="w-28 shrink-0 snap-start">
      <Link
        href={`/person/${id}`}
        className="group flex flex-col rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative flex aspect-2/3 items-center justify-center overflow-hidden rounded-xl border border-border bg-canvas-soft transition-shadow duration-150 group-hover:shadow-glow">
          {src ? (
            <LoadingImage src={src} alt="" fill unoptimized loading="lazy" sizes="112px" className="object-cover object-top" />
          ) : (
            <span aria-hidden className="text-display-sm text-mute">
              {initials(name)}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-caption font-medium text-ink">{name}</p>
        {character && <p className="line-clamp-2 text-caption text-mute">{character}</p>}
      </Link>
    </li>
  );
}

// Headshot, or the person's initials when there's no photo.
function PersonAvatar({ name, path }: { name: string; path: string | null }) {
  const src = profileUrl(path);
  return (
    <Avatar className="size-12">
      {src && <AvatarImage src={src} alt="" loading="lazy" className="object-top" />}
      <AvatarFallback className="bg-canvas-soft text-caption font-medium text-mute">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export type TitleData = {
  kind: TitleKind;
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  tagline: string;
  overview: string;
  genres: TmdbGenre[];
  rating: { average: number; count: number };
  // Year, runtime or seasons, joined with "·".
  facts: string[];
  // Directors of a film, creators of a series.
  makers: { role: string; people: { id: number; name: string; profile_path: string | null }[] };
  cast: TmdbCastMember[];
  imdbId: string | null;
  media: MovieMedia;
  // Members' actions under the title; absent for visitors.
  actions?: React.ReactNode;
  // Tapping a where-to-watch option marks a member's film as being watched.
  tracked: boolean;
};

export function TitleDetails(t: TitleData) {
  const cast = [...t.cast].sort((a, b) => a.order - b.order).slice(0, CAST_SHOWN);
  const rated = t.rating.count > 0;
  // The main backdrop first, then the other stills (at most 8 in the loop).
  const bannerPaths = [
    ...new Set([t.backdropPath, ...t.media.stills.map((s) => s.file_path)].filter((p): p is string => !!p)),
  ].slice(0, 8);
  const banner = bannerPaths.length > 0;
  const { media } = t;

  return (
    <>
      <Banner paths={bannerPaths} />
      <article className={cn(PAGE, "flex flex-col gap-10 pb-10", banner ? "pt-0" : "pt-16 md:pt-20")}>
        {/* Phones: the poster rises into the banner. Wider: poster and title
            rise together, so their tops line up. */}
        <div className={cn("relative flex flex-col gap-6 sm:flex-row sm:gap-8", banner && "sm:-mt-24")}>
          <Poster
            path={t.posterPath}
            title={t.title}
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
              <Title title={t.title} logo={media.logo} />
              {(rated || t.facts.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {rated && <FilmRating average={t.rating.average} count={t.rating.count} prominent />}
                  {t.facts.length > 0 && <p className="font-mono text-code text-mute">{t.facts.join(" · ")}</p>}
                </div>
              )}
              {t.makers.people.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-3" aria-label={`${t.makers.role}s`}>
                  {t.makers.people.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/person/${d.id}`}
                        className="group flex items-center gap-3 rounded-full pr-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <PersonAvatar name={d.name} path={d.profile_path} />
                        <span className="flex flex-col">
                          <span className="text-caption text-mute">{t.makers.role}</span>
                          <span className="text-body-md font-semibold text-ink underline-offset-4 group-hover:underline">
                            {d.name}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {t.actions}
            {t.tagline && <p className="text-body-lg text-pretty text-ink">{t.tagline}</p>}
            {t.overview && <p className="max-w-prose text-body-md text-pretty text-body">{t.overview}</p>}
            {t.genres.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Genres">
                {t.genres.map((g) => (
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
          <WhereToWatch kind={t.kind} tmdbId={t.id} title={t.title} imdbId={t.imdbId} tracked={t.tracked} />
        </Suspense>

        {media.trailer && (
          <Section id="trailer" title="Trailer">
            <VideoPlayer
              videoKey={media.trailer.key}
              label={`Trailer for ${t.title}`}
              sizes="(min-width: 896px) 848px, 100vw"
              large
            />
          </Section>
        )}

        {media.stills.length > 0 && (
          <Section id="stills" title="Stills">
            <StillsGallery paths={media.stills.map((s) => s.file_path)} title={t.title} />
          </Section>
        )}

        {cast.length > 0 && (
          <Section id="cast" title="Cast">
            <ul className={SHELF}>
              {cast.map((c) => (
                <CastCard key={c.id} id={c.id} name={c.name} character={c.character} path={c.profile_path} />
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

export function TitleSkeleton() {
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

// The page frame: a Back button floating over the banner's top edge.
export function TitleShell({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <section className="relative flex flex-col">
      <div className={cn(PAGE, "absolute inset-x-0 top-0 z-10 pt-3 md:pt-5")}>
        {/* "/" sends members on to their picks (proxy.ts). */}
        <BackButton fallback="/" className="bg-canvas/70 backdrop-blur-sm" />
      </div>
      <Suspense fallback={fallback ?? <TitleSkeleton />}>{children}</Suspense>
    </section>
  );
}
