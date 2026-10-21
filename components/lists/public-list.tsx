import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { LiveTag } from "@/components/lists/lists-shelf";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { PageBackdrop, RankedFilm } from "@/components/profile/public-profile";
import { CopyLink, ShareButton } from "@/components/profile/share-profile";
import { ProfileFooter } from "@/components/site/footer";
import { ScrollHeader } from "@/components/site/scroll-header";
import { Button } from "@/components/ui/button";
import type { ListFilm } from "@/lib/lists/resolve";
import { listPath } from "@/lib/lists/rules";
import type { SharedList } from "@/lib/lists/store";
import { profilePath } from "@/lib/profile/rules";
import type { Profile } from "@/lib/profile/store";

type Viewer = "owner" | "member" | "visitor";

// A shared list at /@handle/lists/<slug>: its name, whose it is, and its
// films in the owner's order. Same frame as the profile it hangs off.
export function PublicList({
  profile,
  list,
  films,
  backdrops,
  viewer,
}: {
  profile: Profile & { handle: string };
  list: SharedList;
  films: ListFilm[];
  // Each film's still (TMDB backdrop path), in list order.
  backdrops: string[];
  viewer: Viewer;
}) {
  const owner = viewer === "owner";
  const name = profile.displayName ?? profile.handle;
  const path = listPath(profile.handle, list.slug);
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollHeader viewer={viewer === "visitor" ? "visitor" : "member"} watchId="list-title" back={profilePath(profile.handle)} />
      <PageBackdrop paths={backdrops} visitor={viewer === "visitor"} back={profilePath(profile.handle)} />

      <main className="relative mx-auto -mt-16 flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pb-12 sm:-mt-20 sm:px-6">
        <header className="flex flex-col gap-5">
          <Byline profile={profile} />
          <div className="flex flex-col gap-3">
            <h1 id="list-title" className="text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-balance text-ink-strong sm:text-display-lg">
              {list.name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body-md text-body">
              <span>
                <span className="font-mono text-ink tabular-nums">{films.length}</span>{" "}
                {films.length === 1 ? "film" : "films"}
              </span>
              {list.synced && <LiveTag />}
            </p>
          </div>
          {owner && (
            <div className="flex flex-col gap-2">
              <CopyLink path={path} className="sm:max-w-md" />
              <div className="flex gap-2">
                <ShareButton
                  path={path}
                  title={`${list.name} · ${name} on Next Movie`}
                  text={`${list.name}: ${films.length} ${films.length === 1 ? "film" : "films"}.`}
                  label="Share list"
                  className="flex-1 sm:flex-none"
                />
                <Button
                  variant="outline"
                  className="sm:px-4"
                  render={<Link href={`/lists/${list.id}/edit`} />}
                  nativeButton={false}
                  aria-label="Edit list"
                >
                  <PencilIcon />
                  <span className="max-sm:sr-only">Edit list</span>
                </Button>
              </div>
            </div>
          )}
        </header>

        {films.length > 0 ? (
          <ol aria-label={list.name} className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
            {films.map((m, i) => (
              <RankedFilm key={m.tmdbId} movie={m} rank={i + 1} />
            ))}
          </ol>
        ) : (
          <p className="text-body-md text-body">
            {owner ? "Every film has left this list. Edit it to add some." : "No films in this list right now."}
          </p>
        )}
      </main>

      <ProfileFooter />
    </div>
  );
}

// Whose page this is: their picture and name, back to their profile.
export function Byline({ profile }: { profile: Profile & { handle: string } }) {
  const name = profile.displayName ?? profile.handle;
  return (
    <Link
      href={profilePath(profile.handle)}
      className="group/by flex items-center gap-2.5 self-start rounded-full pr-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ProfileAvatar avatar={profile.avatar} name={name} preload className="size-9 ring-2 ring-canvas" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-body-sm font-semibold text-ink group-hover/by:text-primary-soft">{name}</span>
        <span className="truncate text-caption text-mute">@{profile.handle}</span>
      </span>
    </Link>
  );
}
