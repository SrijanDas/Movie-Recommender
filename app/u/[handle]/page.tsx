import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicProfile } from "@/components/profile/public-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getListCards } from "@/lib/lists/public";
import { getUserMovies } from "@/lib/movies/store";
import { favoritesInOrder } from "@/lib/recommend/profile";
import { normalizeHandle, profilePath } from "@/lib/profile/rules";
import { getProfileByHandle } from "@/lib/profile/store";
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
  const [viewer, movies, lists] = await Promise.all([
    getCurrentUser(),
    getUserMovies(profile.userId),
    getListCards(profile.userId, profile.handle),
  ]);
  const taste = await getTaste(movies);
  return (
    <PublicProfile
      profile={profile}
      taste={taste}
      lists={lists}
      viewer={!viewer ? "visitor" : viewer.id === profile.userId ? "owner" : "member"}
    />
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
