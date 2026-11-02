import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PeoplePage } from "@/components/social/people-page";
import { PeopleSkeleton } from "@/components/social/people-search";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { normalizeHandle } from "@/lib/profile/rules";
import { getProfileByHandle } from "@/lib/profile/store";
import { followingPath } from "@/lib/social/rules";
import { getFollowing, getFollowingIds } from "@/lib/social/store";

// Following of a profile. Served at /@handle/following (next.config.ts
// rewrites it here) and open to signed-out visitors, like the profile.

type Params = PageProps<"/u/[handle]/following">["params"];

async function load(raw: string) {
  const profile = await getProfileByHandle(normalizeHandle(decodeURIComponent(raw)));
  return profile?.handle ? { ...profile, handle: profile.handle } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = await load((await params).handle);
  if (!profile) return { title: "Not found" };
  const name = profile.displayName ?? profile.handle;
  return { title: `Following · ${name} (@${profile.handle})`, alternates: { canonical: followingPath(profile.handle) } };
}

async function People({ params }: { params: Params }) {
  const profile = await load((await params).handle);
  if (!profile) notFound();
  const [viewer, people] = await Promise.all([getCurrentUser(), getFollowing(profile.userId)]);
  const following = viewer ? await getFollowingIds(viewer.id) : new Set<string>();
  return (
    <PeoplePage
      profile={profile}
      kind="following"
      people={people}
      viewer={viewer ? { kind: "member", id: viewer.id, following } : { kind: "visitor" }}
    />
  );
}

function PeoplePageSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <Skeleton className="h-[clamp(13rem,38svh,24rem)] w-full rounded-none" />
      <div className="mx-auto -mt-16 flex w-full max-w-3xl flex-col gap-5 px-4 sm:px-6">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-24" />
        <div className="mt-4">
          <PeopleSkeleton />
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: PageProps<"/u/[handle]/following">) {
  return (
    <Suspense fallback={<PeoplePageSkeleton />}>
      <People params={params} />
    </Suspense>
  );
}
