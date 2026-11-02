import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicProfile } from "@/components/profile/public-profile";
import { FollowButton } from "@/components/social/follow-button";
import { RecommendTo } from "@/components/social/recommend-to";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getListCards } from "@/lib/lists/public";
import { getUserMovies } from "@/lib/movies/store";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { normalizeHandle, profilePath } from "@/lib/profile/rules";
import { getProfile, getProfileByHandle } from "@/lib/profile/store";
import { getFollowStats, isFollowing } from "@/lib/social/store";
import { filterMyFilms } from "@/lib/movies/types";
import { getTaste } from "@/lib/profile/taste";

// A public profile. Served at /@handle (next.config.ts rewrites it here) and
// open to signed-out visitors (proxy.ts), so it's the link people share.

async function load(raw: string) {
  const handle = normalizeHandle(decodeURIComponent(raw));
  const profile = await getProfileByHandle(handle);
  return profile?.handle ? { ...profile, handle: profile.handle } : null;
}

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const profile = await load((await params).handle);
  if (!profile) return { title: "Profile not found" };
  const name = profile.displayName ?? profile.handle;
  const top = favoritesInOrder((await getUserMovies(profile.userId)).filter((m) => m.signal === "favorite"))
    .slice(0, 3)
    .map((m) => m.title);
  const description =
    profile.bio ?? (top.length > 0 ? `Favourite films: ${top.join(", ")}.` : `${name}’s favourite films on Next Movie.`);
  return {
    title: `${name} (@${profile.handle})`,
    description,
    alternates: { canonical: profilePath(profile.handle) },
    openGraph: { title: `${name} on Next Movie`, description, type: "profile", url: profilePath(profile.handle) },
    twitter: { card: "summary_large_image", title: `${name} on Next Movie`, description },
  };
}

async function Profile({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const profile = await load((await params).handle);
  if (!profile) notFound();
  const [viewer, movies, lists, social] = await Promise.all([
    getCurrentUser(),
    getUserMovies(profile.userId),
    getListCards(profile.userId, profile.handle),
    getFollowStats(profile.userId),
  ]);
  const taste = await getTaste(movies);
  const member = viewer && viewer.id !== profile.userId ? viewer : null;
  return (
    <PublicProfile
      profile={profile}
      taste={taste}
      lists={lists}
      social={social}
      viewer={!viewer ? "visitor" : member ? "member" : "owner"}
      memberActions={member && <MemberActions viewerId={member.id} profile={profile} />}
    />
  );
}

// Follow them, or send them a film (from your own films, or any) or one of
// your lists.
async function MemberActions({ viewerId, profile }: { viewerId: string; profile: { userId: string; handle: string; displayName: string | null; avatar: string | null } }) {
  const [following, mine, me] = await Promise.all([
    isFollowing(viewerId, profile.userId),
    getUserMovies(viewerId),
    getProfile(viewerId),
  ]);
  const lists = me?.handle ? await getListCards(viewerId, me.handle) : [];
  // Your favourites first, then everything else you've seen, newest first.
  const seen = filterMyFilms(mine, "all");
  const favourites = filterMyFilms(mine, "favorite");
  const starters = [...favourites, ...seen.filter((m) => m.signal !== "favorite")]
    .slice(0, 60)
    .map(({ tmdbId, title, year, posterPath }) => ({ tmdbId, title, year, posterPath }));
  const name = profile.displayName ?? profile.handle;
  return (
    <>
      <FollowButton userId={profile.userId} name={name} following={following} className="flex-1 sm:flex-none" />
      <RecommendTo person={profile} starters={starters} lists={lists} className="flex-1 sm:flex-none" />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <Skeleton className="h-[clamp(13rem,38svh,24rem)] w-full rounded-none" />
      <div className="mx-auto -mt-16 flex w-full max-w-3xl flex-col gap-5 px-4 sm:px-6">
        <Skeleton className="size-24 rounded-full ring-4 ring-canvas" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-64" />
        <div className="mt-6 flex items-end gap-4">
          <Skeleton className="aspect-2/3 w-[46%] max-w-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}
