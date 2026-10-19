import { PencilIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Poster } from "@/components/movies/poster";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ShareProfileButton } from "@/components/profile/share-profile";
import { Logo } from "@/components/site/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserMovie } from "@/lib/movies/types";
import type { Profile } from "@/lib/profile/store";
import type { Taste } from "@/lib/profile/taste";
import { backdropUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

type Viewer = "owner" | "member" | "visitor";

// Someone's public page at /@handle: who they are, their taste in a few
// lines, and their favourites ranked. Visitors get one way in at the bottom.
export function PublicProfile({
  profile,
  taste,
  viewer,
}: {
  profile: Profile & { handle: string };
  taste: Taste;
  viewer: Viewer;
}) {
  const name = profile.displayName ?? profile.handle;
  const backdrop = backdropUrl(taste.backdropPath);
  const [first, ...rest] = taste.favorites;

  return (
    <div className={cn("flex min-h-svh flex-col", viewer !== "owner" && "pb-[calc(5.5rem+env(safe-area-inset-bottom))]")}>
      {/* The #1 favourite's still, fading into the page. */}
      <div className="relative h-[clamp(13rem,38svh,24rem)] w-full overflow-hidden bg-canvas">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            preload
            unoptimized
            sizes="100vw"
            className="object-cover object-[50%_30%] opacity-70 [mask-image:linear-gradient(to_bottom,black_35%,transparent)]"
          />
        )}
        <div className="relative mx-auto flex max-w-3xl items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
          <Logo href={viewer === "visitor" ? "/" : "/recommendations"} />
        </div>
      </div>

      <main className="relative mx-auto -mt-16 flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 sm:-mt-20 sm:px-6">
        <header className="flex flex-col gap-5">
          <ProfileAvatar
            avatar={profile.avatar}
            name={name}
            preload
            className="size-24 ring-4 ring-canvas sm:size-28"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-balance text-ink-strong sm:text-display-lg">
              {name}
            </h1>
            <p className="text-body-md text-mute">@{profile.handle}</p>
          </div>
          {profile.bio && <p className="max-w-[60ch] text-body-lg text-pretty text-ink">{profile.bio}</p>}
          <TasteLine taste={taste} />
          {viewer === "owner" && (
            <div className="flex gap-2">
              <ShareProfileButton handle={profile.handle} name={name} className="flex-1 sm:flex-none" />
              <Button
                variant="outline"
                className="sm:px-4"
                render={<Link href="/account/edit" />}
                nativeButton={false}
                aria-label="Edit profile"
              >
                <PencilIcon />
                <span className="max-sm:sr-only">Edit profile</span>
              </Button>
            </div>
          )}
        </header>

        <section aria-labelledby="favourites" className="flex flex-col gap-5">
          <h2 id="favourites" className="text-display-sm text-ink-strong">
            Favourite films, ranked
          </h2>
          {first ? (
            <>
              <TopFilm movie={first} linked={viewer !== "visitor"} />
              {rest.length > 0 && (
                <ol start={2} className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
                  {rest.map((m, i) => (
                    <RankedFilm key={m.tmdbId} movie={m} rank={i + 2} linked={viewer !== "visitor"} />
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p className="text-body-md text-body">No favourites picked yet.</p>
          )}
        </section>
      </main>

      {viewer !== "owner" && <JoinBar viewer={viewer} />}
    </div>
  );
}

// "142 films seen · 23 called Peak", then who and what they keep coming
// back to. Only says what the list supports.
function TasteLine({ taste }: { taste: Taste }) {
  const facts = [
    taste.seen > 0 && { n: taste.seen, label: taste.seen === 1 ? "film seen" : "films seen" },
    taste.peak > 0 && { n: taste.peak, label: "called Peak" },
  ].filter(Boolean) as { n: number; label: string }[];
  const directors = taste.directors.join(" and ");
  if (facts.length === 0 && !directors && taste.genres.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {facts.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-body-md text-body">
          {facts.map((f, i) => (
            <span key={f.label} className="flex items-baseline gap-x-2">
              {i > 0 && <span aria-hidden className="text-mute">·</span>}
              <span>
                <span className="font-mono text-ink tabular-nums">{f.n}</span> {f.label}
              </span>
            </span>
          ))}
        </p>
      )}
      {directors && (
        <p className="text-body-md text-body">
          Keeps coming back to <span className="text-ink">{directors}</span>.
        </p>
      )}
      {taste.genres.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Favourite genres">
          {taste.genres.map((g) => (
            <li key={g}>
              <Badge variant="outline" className="h-7 rounded-full px-3 text-body-sm text-ink">
                {g}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilmLink({ movie, linked, children, className }: { movie: UserMovie; linked: boolean; children: React.ReactNode; className?: string }) {
  return linked ? (
    <Link href={`/movie/${movie.tmdbId}`} className={cn("group/film rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

// The #1 film gets the stage: a big poster and its title beside it.
function TopFilm({ movie, linked }: { movie: UserMovie; linked: boolean }) {
  return (
    <FilmLink movie={movie} linked={linked} className="flex items-end gap-4 sm:gap-6">
      <Poster
        path={movie.posterPath}
        title={movie.title}
        size="w500"
        sizes="(min-width: 640px) 220px, 46vw"
        preload
        className="w-[46%] max-w-56 shrink-0 shadow-glow transition-[border-color] duration-200 group-hover/film:border-hairline-soft/50"
      />
      <div className="flex min-w-0 flex-col gap-2 pb-1">
        <span className="font-mono text-display-lg leading-none text-ink-strong tabular-nums" aria-label="Number 1">
          1
        </span>
        <p className="text-display-sm text-balance text-ink-strong">{movie.title}</p>
        {movie.year && <p className="font-mono text-code text-mute">{movie.year}</p>}
      </div>
    </FilmLink>
  );
}

function RankedFilm({ movie, rank, linked }: { movie: UserMovie; rank: number; linked: boolean }) {
  return (
    <li>
      <FilmLink movie={movie} linked={linked} className="flex flex-col gap-2">
        <div className="relative">
          <Poster
            path={movie.posterPath}
            title={movie.title}
            sizes="(min-width: 768px) 140px, (min-width: 640px) 25vw, 33vw"
            className="transition-[border-color] duration-200 group-hover/film:border-hairline-soft/50"
          />
          <span
            className="absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-canvas px-1.5 font-mono text-code text-ink tabular-nums"
            aria-label={`Number ${rank}`}
          >
            {rank}
          </span>
        </div>
        <p className="line-clamp-2 text-caption font-medium text-body">{movie.title}</p>
      </FilmLink>
    </li>
  );
}

// Visitors: what this is and one way in. Members: back to their picks.
function JoinBar({ viewer }: { viewer: Exclude<Viewer, "owner"> }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-canvas pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-body-sm font-semibold text-ink">
            {viewer === "visitor" ? "Get picks like these" : "Find your next film"}
          </p>
          <p className="truncate text-caption text-mute">
            {viewer === "visitor" ? "Tap films you love. We say why." : "Your picks are waiting."}
          </p>
        </div>
        <Button
          className="shrink-0"
          render={<Link href={viewer === "visitor" ? "/sign-up" : "/recommendations"} />}
          nativeButton={false}
        >
          {viewer === "visitor" ? "Make yours" : "Open"}
        </Button>
      </div>
    </div>
  );
}
