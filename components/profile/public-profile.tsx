import { ArrowUpDownIcon, ArrowUpRightIcon, PencilIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListsShelf } from "@/components/lists/lists-shelf";
import { ANSWERS } from "@/components/movies/feedback";
import { Poster } from "@/components/movies/poster";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { OwnerSeenShelf } from "@/components/profile/seen-shelf";
import { ProfileLink, ShareProfileButton } from "@/components/profile/share-profile";
import { ProfileFooter } from "@/components/site/footer";
import { Logo } from "@/components/site/logo";
import { ScrollHeader } from "@/components/site/scroll-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListCard } from "@/lib/lists/public";
import type { UserMovie } from "@/lib/movies/types";
import { profilePath } from "@/lib/profile/rules";
import type { Profile } from "@/lib/profile/store";
import type { Taste } from "@/lib/profile/taste";
import { backdropUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

type Viewer = "owner" | "member" | "visitor";

// The most posters a Seen it shelf shows before "+N more".
const SHELF_MAX = 20;

// Someone's profile: who they are, their taste in a few lines, their
// favourites ranked, their shared lists, and everything else they've seen, by
// answer (minus the answers they chose to hide).
// - "page": the public /@handle page, with its own top bar, a footer, and, for
//   anyone who isn't the owner, a header with one action once they scroll.
// - "app": the owner's Profile tab (/account): just who they are and the
//   share/edit controls (no backdrop) and their lists, inside the app shell;
//   `children` (settings) follow.
export function PublicProfile({
  profile,
  taste,
  viewer,
  variant = "page",
  lists = [],
  children,
}: {
  profile: Profile;
  taste: Taste;
  viewer: Viewer;
  variant?: "page" | "app";
  // Their shared lists, newest first.
  lists?: ListCard[];
  children?: React.ReactNode;
}) {
  const handle = profile.handle;
  const name = profile.displayName ?? handle ?? "You";
  const backdrop = backdropUrl(taste.backdropPath);
  const [first, ...rest] = taste.favorites;
  const owner = viewer === "owner";
  const page = variant === "page";
  const hidden = new Set(profile.hiddenSeen);
  // The owner sees every list here, hidden ones too, to switch them back on.
  const seenFilms = owner ? taste.seenFilms : taste.seenFilms.filter((m) => !hidden.has(m.signal));

  return (
    <div className={cn("flex flex-col", page && "min-h-svh")}>
      {page && !owner && <ScrollHeader viewer={viewer === "member" ? "member" : "visitor"} watchId="profile-name" />}
      {/* The #1 favourite's still, fading into the page. */}
      {page && <PageBackdrop backdrop={backdrop} visitor={viewer === "visitor"} />}

      <main
        className={cn(
          "relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 sm:px-6",
          page ? "-mt-16 pb-12 sm:-mt-20" : "pt-6 pb-4 md:pt-10",
        )}
      >
        <header className="flex flex-col gap-5">
          <ProfileAvatar avatar={profile.avatar} name={name} preload className="size-24 ring-4 ring-canvas sm:size-28" />
          <div className="flex flex-col gap-1">
            <h1 id="profile-name" className="text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-balance text-ink-strong sm:text-display-lg">
              {name}
            </h1>
            {handle && <p className="text-body-md text-mute">@{handle}</p>}
          </div>
          {profile.bio && <p className="max-w-[60ch] text-body-lg text-pretty text-ink">{profile.bio}</p>}
          <TasteLine taste={taste} showPeak={!hidden.has("peak")} />
          {owner && <OwnerActions handle={handle} name={name} showPublicLink={!page} />}
        </header>

        {page && (
          <section aria-labelledby="favourites" className="flex flex-col gap-5">
            <SectionHeading id="favourites" title="Favourite films, ranked">
              {owner && taste.favorites.length > 1 && (
                <EditLink href="/my-movies/favourites" icon={<ArrowUpDownIcon />}>
                  Reorder
                </EditLink>
              )}
            </SectionHeading>
            {first ? (
              <>
                <TopFilm movie={first} />
                {rest.length > 0 && (
                  <ol start={2} className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
                    {rest.map((m, i) => (
                      <RankedFilm key={m.tmdbId} movie={m} rank={i + 2} />
                    ))}
                  </ol>
                )}
              </>
            ) : (
              <p className="text-body-md text-body">No favourites picked yet.</p>
            )}
          </section>
        )}

        {handle && (owner || lists.length > 0) && (
          <section aria-labelledby="lists" className="flex flex-col gap-4">
            <SectionHeading id="lists" title="Lists" />
            {owner && lists.length === 0 && (
              <p className="-mt-2 text-body-sm text-mute">
                Share your watchlist, a slice of My films, or any films in your own order.
              </p>
            )}
            <ListsShelf lists={lists} owner={owner} />
          </section>
        )}

        {page && seenFilms.length > 0 && <SeenShelves films={seenFilms} owner={owner} hidden={hidden} />}

        {children}
      </main>

      {page && <ProfileFooter />}
    </div>
  );
}

// A public page's top: a film still fading into the page, under the logo.
export function PageBackdrop({ backdrop, visitor }: { backdrop: string | null; visitor: boolean }) {
  return (
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
        <Logo href={visitor ? "/" : "/recommendations"} />
      </div>
    </div>
  );
}

export function SectionHeading({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="text-display-sm text-ink-strong">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function EditLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="lg"
      className="-mr-2 shrink-0 px-2 text-body-sm text-body hover:text-ink"
      render={<Link href={href} />}
      nativeButton={false}
    >
      {icon}
      {children}
    </Button>
  );
}

// Share and Edit for the owner; in the app, also a way to see the public page.
// Accounts without a username are asked to pick one first.
function OwnerActions({ handle, name, showPublicLink }: { handle: string | null; name: string; showPublicLink: boolean }) {
  if (!handle) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas-soft p-5">
        <p className="text-display-sm text-ink-strong">Get your profile link</p>
        <p className="text-body-sm text-body">
          Pick a username and this page becomes yours to share. Put it in your bio, send it to friends.
        </p>
        <Button className="self-start" render={<Link href="/account/edit" />} nativeButton={false}>
          Pick a username
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {showPublicLink && <ProfileLink handle={handle} className="sm:max-w-md" />}
      <div className="flex gap-2">
        <ShareProfileButton handle={handle} name={name} className="flex-1 sm:flex-none" />
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
      {showPublicLink && (
        <Button
          variant="ghostGreen"
          className="-ml-2 self-start px-2 text-body-sm"
          render={<Link href={profilePath(handle)} />}
          nativeButton={false}
        >
          View your public page
          <ArrowUpRightIcon />
        </Button>
      )}
    </div>
  );
}

// Everything else they've seen, one shelf per answer, best first. The owner
// edits answers from My films (Manage) and picks which shelves others see.
function SeenShelves({
  films,
  owner,
  hidden,
}: {
  films: UserMovie[];
  owner: boolean;
  hidden: Set<string>;
}) {
  const shelves = [...ANSWERS]
    .reverse()
    .map((answer) => ({ answer, films: films.filter((m) => m.signal === answer.feedback) }))
    .filter((s) => s.films.length > 0);
  return (
    <section aria-labelledby="seen" className="flex flex-col gap-6">
      <SectionHeading id="seen" title="Seen it">
        {owner && (
          <EditLink href="/my-movies" icon={<PencilIcon />}>
            Manage
          </EditLink>
        )}
      </SectionHeading>
      {owner && <p className="-mt-3 text-body-sm text-mute">Switch a list off to keep it off your profile. Only you see it here.</p>}
      {shelves.map(({ answer, films: shelf }) => {
        const Icon = answer.icon;
        const more = shelf.length - SHELF_MAX;
        const heading = (
          <h3 className="flex min-w-0 items-center gap-2 text-body-md font-semibold text-ink">
            <Icon className={cn("size-4 shrink-0", answer.feedback === "peak" ? "text-primary-soft" : "text-mute")} aria-hidden />
            <span className="truncate">{answer.label}</span>
            <span className="font-mono text-code font-normal text-mute tabular-nums">{shelf.length}</span>
          </h3>
        );
        const list = (
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6">
            {shelf.slice(0, SHELF_MAX).map((m) => (
              <SeenFilm key={m.tmdbId} movie={m} />
            ))}
            {more > 0 && (
              <li className="flex w-26 shrink-0 snap-start">
                {owner ? (
                  <Link
                    href="/my-movies"
                    className="flex aspect-2/3 w-full items-center justify-center rounded-xl border border-border bg-canvas-soft font-mono text-code text-body outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    +{more} more
                  </Link>
                ) : (
                  <span className="flex aspect-2/3 w-full items-center justify-center rounded-xl border border-border bg-canvas-soft font-mono text-code text-mute">
                    +{more} more
                  </span>
                )}
              </li>
            )}
          </ul>
        );
        return owner ? (
          <OwnerSeenShelf
            key={answer.feedback}
            answer={answer.feedback}
            label={answer.label}
            shown={!hidden.has(answer.feedback)}
            heading={heading}
          >
            {list}
          </OwnerSeenShelf>
        ) : (
          <div key={answer.feedback} className="flex flex-col gap-3">
            {heading}
            {list}
          </div>
        );
      })}
    </section>
  );
}

// "142 films seen · 23 called Peak", then who and what they keep coming
// back to. Only says what the list supports.
function TasteLine({ taste, showPeak }: { taste: Taste; showPeak: boolean }) {
  const facts = [
    taste.seen > 0 && { n: taste.seen, label: taste.seen === 1 ? "film seen" : "films seen" },
    showPeak && taste.peak > 0 && { n: taste.peak, label: "called Peak" },
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

// Every film opens its page; film pages are public, like this one.
type ShownFilm = Pick<UserMovie, "tmdbId" | "title" | "posterPath">;

function FilmLink({ movie, children, className }: { movie: ShownFilm; children: React.ReactNode; className?: string }) {
  return (
    <Link href={`/movie/${movie.tmdbId}`} className={cn("group/film rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      {children}
    </Link>
  );
}

// The #1 film gets the stage: a big poster and its title beside it.
function TopFilm({ movie }: { movie: UserMovie }) {
  return (
    <FilmLink movie={movie} className="flex items-end gap-4 sm:gap-6">
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

export function RankedFilm({ movie, rank }: { movie: ShownFilm; rank: number }) {
  return (
    <li>
      <FilmLink movie={movie} className="flex flex-col gap-2">
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

// One poster on a Seen it shelf.
function SeenFilm({ movie }: { movie: UserMovie }) {
  return (
    <li className="w-26 shrink-0 snap-start">
      <FilmLink movie={movie} className="flex flex-col gap-2">
        <Poster
          path={movie.posterPath}
          title={movie.title}
          size="w185"
          sizes="104px"
          className="transition-[border-color] duration-200 group-hover/film:border-hairline-soft/50"
        />
        <span className="line-clamp-2 text-caption font-medium text-body">{movie.title}</span>
      </FilmLink>
    </li>
  );
}
