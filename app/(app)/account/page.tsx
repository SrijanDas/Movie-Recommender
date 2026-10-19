import { ArrowUpRightIcon, LogOutIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ProfileLink, ShareProfileButton } from "@/components/profile/share-profile";
import { InstallApp } from "@/components/site/install-app";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId, getCurrentUser } from "@/lib/auth";
import { profilePath } from "@/lib/profile/rules";
import { getProfile } from "@/lib/profile/store";

export const metadata: Metadata = { title: "Profile" };

// Who you are here and your shareable link, then the account bits.
async function Identity() {
  const userId = await requireUserId();
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile(userId)]);
  const name = profile?.displayName ?? user?.name ?? null;
  const handle = profile?.handle ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ProfileAvatar avatar={profile?.avatar ?? null} name={name ?? user?.email ?? null} preload className="size-20" />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-display-md text-ink-strong">{name ?? "Your profile"}</h1>
          {handle && <p className="truncate text-body-md text-mute">@{handle}</p>}
        </div>
      </div>
      {profile?.bio && <p className="text-body-md text-pretty text-ink">{profile.bio}</p>}

      {handle ? (
        <div className="flex flex-col gap-3">
          <ProfileLink handle={handle} />
          <div className="flex gap-2">
            <ShareProfileButton handle={handle} name={name ?? handle} className="flex-1" />
            <Button variant="outline" render={<Link href="/account/edit" />} nativeButton={false}>
              <PencilIcon />
              Edit
            </Button>
          </div>
          <Button
            variant="ghostGreen"
            className="-ml-2 self-start px-2 text-body-sm"
            render={<Link href={profilePath(handle)} />}
            nativeButton={false}
          >
            See your public page
            <ArrowUpRightIcon />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas-soft p-5">
          <p className="text-display-sm text-ink-strong">Get your profile link</p>
          <p className="text-body-sm text-body">
            Pick a username and your favourites get a page of their own. Put it in your bio, send it to friends.
          </p>
          <Button className="self-start" render={<Link href="/account/edit" />} nativeButton={false}>
            Pick a username
          </Button>
        </div>
      )}
    </div>
  );
}

function IdentitySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

async function Email() {
  const user = await getCurrentUser();
  return <p className="truncate text-body-md text-body">{user?.email ?? "Signed in"}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-5">
      <h2 className="text-body-sm font-semibold text-mute">{title}</h2>
      {children}
    </section>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-6 pb-8 sm:px-6 md:py-10">
      <Suspense fallback={<IdentitySkeleton />}>
        <Identity />
      </Suspense>
      <div className="flex flex-col border-t border-border">
        <Section title="Signed in as">
          <Suspense fallback={<Skeleton className="h-6 w-48" />}>
            <Email />
          </Suspense>
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
