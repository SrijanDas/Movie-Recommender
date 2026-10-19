import { LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { PublicProfile } from "@/components/profile/public-profile";
import { InstallApp } from "@/components/site/install-app";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, requireUserId } from "@/lib/auth";
import { getListCards } from "@/lib/lists/public";
import { getUserMovies } from "@/lib/movies/store";
import { getProfile } from "@/lib/profile/store";
import { getTaste } from "@/lib/profile/taste";

export const metadata: Metadata = { title: "Profile" };

// Who you are on Next Movie and your share link (the films live on your
// public page and My films), then the account settings.
async function OwnProfile() {
  const userId = await requireUserId();
  const [user, profile, movies] = await Promise.all([getCurrentUser(), getProfile(userId), getUserMovies(userId)]);
  const [taste, lists] = await Promise.all([
    getTaste(movies),
    profile?.handle ? getListCards(userId, profile.handle) : [],
  ]);
  return (
    <PublicProfile
      variant="app"
      viewer="owner"
      lists={lists}
      profile={{
        userId,
        handle: profile?.handle ?? null,
        displayName: profile?.displayName ?? user?.name ?? null,
        bio: profile?.bio ?? null,
        avatar: profile?.avatar ?? null,
        hiddenSeen: profile?.hiddenSeen ?? [],
      }}
      taste={taste}
    >
      <Settings email={user?.email ?? null} />
    </PublicProfile>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-5">
      <h2 className="text-body-sm font-semibold text-mute">{title}</h2>
      {children}
    </section>
  );
}

function Settings({ email }: { email: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col border-t border-border">
        <Section title="Signed in as">
          <p className="truncate text-body-md text-body">{email ?? "Signed in"}</p>
        </Section>
        <Section title="Get the app">
          <p className="text-body-sm text-body">
            Add Next Movie to your home screen. It opens full screen, straight to your picks.
          </p>
          <InstallApp />
        </Section>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-11 w-full sm:w-auto">
          <LogOutIcon />
          Sign out
        </Button>
      </form>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <Skeleton className="h-[clamp(9rem,26svh,17rem)] w-full rounded-none" />
      <div className="mx-auto -mt-14 flex w-full max-w-3xl flex-col gap-5 px-4 sm:px-6">
        <Skeleton className="size-24 rounded-full ring-4 ring-canvas" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <OwnProfile />
    </Suspense>
  );
}
