import Link from "next/link";
import { Suspense } from "react";
import { AccountButton, AccountButtonFallback } from "@/components/site/account-button";
import { Logo } from "@/components/site/logo";
import {
  SearchButton,
  SearchButtonFallback,
  TabBar,
  TabBarFallback,
  TopNav,
  TopNavFallback,
} from "@/components/site/tab-bar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile/store";

// Sticky top bar. In the installed iOS app it runs under the status bar, so
// it pads by the safe area.
function Bar({ logoHref, children }: { logoHref: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Logo href={logoHref} />
        {children}
      </div>
    </header>
  );
}

// Both lookups are request-cached, so the header and tab bar share them.
async function getMe() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  return { name: profile?.displayName ?? user?.name ?? user?.email ?? null, avatar: profile?.avatar ?? null };
}

async function Account() {
  const me = await getMe();
  return <AccountButton name={me.name} avatar={me.avatar} />;
}

async function Tabs() {
  return <TabBar me={await getMe()} />;
}

// Inside the app: logo, then the nav and account avatar on tablet and up.
// Phones get Search here and the rest, Profile included, in <AppTabBar>.
export function AppHeader() {
  return (
    <Bar logoHref="/recommendations">
      <div className="flex items-center gap-3">
        <Suspense fallback={<TopNavFallback />}>
          <TopNav />
        </Suspense>
        <Suspense fallback={<SearchButtonFallback />}>
          <SearchButton />
        </Suspense>
        <div className="hidden md:flex">
          <Suspense fallback={<AccountButtonFallback />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </Bar>
  );
}

export function AppTabBar() {
  return (
    <Suspense fallback={<TabBarFallback />}>
      <Tabs />
    </Suspense>
  );
}

// Outside the app (landing, sign-in, onboarding): logo and one action.
export function PlainHeader({ logoHref = "/", children }: { logoHref?: string; children?: React.ReactNode }) {
  return <Bar logoHref={logoHref}>{children}</Bar>;
}

const NAV = "h-9 text-body-sm text-body";

// PlainHeader's link on signed-out pages: Sign in, where the page isn't it.
// Credits lives in the footer.
export function SignedOutNav({ signIn = true }: { signIn?: boolean }) {
  if (!signIn) return null;
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className={NAV} render={<Link href="/sign-in" />} nativeButton={false}>
        Sign in
      </Button>
    </nav>
  );
}
