import { LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { TmdbAttribution } from "@/components/site/header";
import { InstallApp } from "@/components/site/install-app";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

async function Who() {
  const user = await getCurrentUser();
  return (
    <div className="flex min-w-0 flex-col">
      {user?.name && <p className="truncate text-display-sm text-ink">{user.name}</p>}
      <p className="truncate text-body-md text-body">{user?.email ?? "Signed in"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-5 first:pt-0">
      <h2 className="text-body-sm font-semibold text-mute">{title}</h2>
      {children}
    </section>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-5 pb-8 sm:px-6 md:py-10">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">Account</h1>
      <div className="flex flex-col">
        <Section title="Signed in as">
          <Suspense fallback={<Skeleton className="h-12 w-48" />}>
            <Who />
          </Suspense>
        </Section>
        <Section title="Get the app">
          <p className="text-body-sm text-body">
            Add Next Movie to your home screen. It opens full screen, straight to your picks.
          </p>
          <InstallApp />
        </Section>
        <Section title="About">
          <TmdbAttribution className="text-body-sm text-body" />
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
