import { Byline } from "@/components/lists/public-list";
import { PageBackdrop } from "@/components/profile/public-profile";
import { FollowButton } from "@/components/social/follow-button";
import { PEOPLE_LIST, PersonRow } from "@/components/social/person-row";
import { ProfileFooter } from "@/components/site/footer";
import { ScrollHeader } from "@/components/site/scroll-header";
import { profilePath } from "@/lib/profile/rules";
import type { Profile } from "@/lib/profile/store";
import type { Person } from "@/lib/social/rules";

type Viewer = { kind: "visitor" } | { kind: "member"; id: string; following: Set<string> };

// Someone's followers, or the people they follow, at /@handle/followers and
// /@handle/following. Same frame as their other pages; members can follow
// anyone listed from here.
export function PeoplePage({
  profile,
  kind,
  people,
  viewer,
}: {
  profile: Profile & { handle: string };
  kind: "followers" | "following";
  people: Person[];
  viewer: Viewer;
}) {
  const back = profilePath(profile.handle);
  const title = kind === "followers" ? "Followers" : "Following";
  const n = people.length;
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollHeader viewer={viewer.kind} watchId="people-title" back={back} />
      <PageBackdrop paths={[]} visitor={viewer.kind === "visitor"} back={back} />

      <main className="relative mx-auto -mt-16 flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-12 sm:-mt-20 sm:px-6">
        <header className="flex flex-col gap-5">
          <Byline profile={profile} />
          <div className="flex flex-col gap-2">
            <h1 id="people-title" className="text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-ink-strong sm:text-display-lg">
              {title}
            </h1>
            <p className="text-body-md text-body">
              <span className="font-mono text-ink tabular-nums">{n}</span> {kind === "followers" ? (n === 1 ? "person" : "people") : n === 1 ? "person" : "people"}
            </p>
          </div>
        </header>

        {n > 0 ? (
          <ul className={PEOPLE_LIST}>
            {people.map((p) => (
              <PersonRow key={p.userId} person={p}>
                {viewer.kind === "member" && p.userId !== viewer.id && (
                  <FollowButton userId={p.userId} name={p.displayName ?? p.handle} following={viewer.following.has(p.userId)} size="lg" />
                )}
              </PersonRow>
            ))}
          </ul>
        ) : (
          <p className="text-body-md text-body">
            {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        )}
      </main>

      <ProfileFooter />
    </div>
  );
}
