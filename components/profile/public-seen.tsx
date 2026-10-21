import { PencilIcon } from "lucide-react";
import { Byline } from "@/components/lists/public-list";
import { ANSWERS } from "@/components/movies/feedback";
import { EditLink, PageBackdrop, RankedFilm } from "@/components/profile/public-profile";
import { SeenToggle } from "@/components/profile/seen-shelf";
import { ShareButton } from "@/components/profile/share-profile";
import { ProfileFooter } from "@/components/site/footer";
import { ScrollHeader } from "@/components/site/scroll-header";
import type { UserMovie } from "@/lib/movies/types";
import { profilePath, seenPath, type SeenSlugAnswer } from "@/lib/profile/rules";
import type { Profile } from "@/lib/profile/store";
import { cn } from "@/lib/utils";

type Viewer = "owner" | "member" | "visitor";

// Every film someone gave one Seen it answer, at /@handle/seen/<answer>,
// newest first. Opened from its card on their profile; same frame as a
// shared list.
export function PublicSeen({
  profile,
  answer,
  hidden,
  films,
  backdrops,
  viewer,
}: {
  profile: Profile & { handle: string };
  answer: SeenSlugAnswer;
  // Whether the owner keeps this answer off their profile (only they get here then).
  hidden: boolean;
  films: UserMovie[];
  // Stills (TMDB backdrop paths) of the first films.
  backdrops: string[];
  viewer: Viewer;
}) {
  const owner = viewer === "owner";
  const name = profile.displayName ?? profile.handle;
  const { label, icon: Icon } = ANSWERS.find((a) => a.feedback === answer)!;
  const path = seenPath(profile.handle, answer);
  const count = `${films.length} ${films.length === 1 ? "film" : "films"}`;
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollHeader viewer={viewer === "visitor" ? "visitor" : "member"} watchId="seen-title" back={profilePath(profile.handle)} />
      <PageBackdrop paths={backdrops} visitor={viewer === "visitor"} back={profilePath(profile.handle)} />

      <main className="relative mx-auto -mt-16 flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pb-12 sm:-mt-20 sm:px-6">
        <header className="flex flex-col gap-5">
          <Byline profile={profile} />
          <div className="flex flex-col gap-3">
            <h1
              id="seen-title"
              className="flex items-center gap-3 text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-balance text-ink-strong sm:text-display-lg"
            >
              <Icon
                className={cn("size-7 shrink-0 sm:size-9", answer === "peak" ? "text-primary-soft" : "text-mute")}
                strokeWidth={1.75}
                aria-hidden
              />
              {label}
            </h1>
            <p className="text-body-md text-body">
              <span className="font-mono text-ink tabular-nums">{films.length}</span>{" "}
              {films.length === 1 ? "film" : "films"} seen
            </p>
          </div>
          {owner && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex gap-2">
                <ShareButton
                  path={path}
                  title={`${label} · ${name} on Next Movie`}
                  text={`${label}: ${count}.`}
                  label="Share"
                  className="flex-1 sm:flex-none"
                />
                <EditLink href="/my-movies" icon={<PencilIcon />}>
                  Manage
                </EditLink>
              </div>
              <SeenToggle answer={answer} label={label} shown={!hidden} className="sm:min-w-44" />
            </div>
          )}
        </header>

        {films.length > 0 ? (
          <ul aria-label={label} className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
            {films.map((m) => (
              <RankedFilm key={m.tmdbId} movie={m} />
            ))}
          </ul>
        ) : (
          <p className="text-body-md text-body">
            {owner ? "No films with this answer yet. Answer Seen it on a film and it shows up here." : "No films here right now."}
          </p>
        )}
      </main>

      <ProfileFooter />
    </div>
  );
}
