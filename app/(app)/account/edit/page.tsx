import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { BackButton } from "@/components/site/back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, requireUserId } from "@/lib/auth";
import { getProfile, suggestHandle } from "@/lib/profile/store";

export const metadata: Metadata = { title: "Edit profile" };

async function Editor() {
  const userId = await requireUserId();
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile(userId)]);
  const name = profile?.displayName ?? user?.name ?? "";
  // Accounts from before usernames get one suggested from their name.
  const suggested = profile?.handle ? null : await suggestHandle(name || (user?.email?.split("@")[0] ?? ""), userId);

  return (
    <ProfileEditor
      saved={{ name, handle: profile?.handle ?? null, bio: profile?.bio ?? "", avatar: profile?.avatar ?? "" }}
      suggestedHandle={suggested}
    />
  );
}

export default function EditProfilePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-5 sm:px-6 md:gap-6 md:pt-10 md:pb-6">
      <div className="flex flex-col gap-2">
        <BackButton fallback="/account" />
        <h1 className="text-display-md text-ink-strong md:text-display-lg">Edit profile</h1>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-8" aria-hidden>
            <Skeleton className="size-28 rounded-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        <Editor />
      </Suspense>
    </section>
  );
}
