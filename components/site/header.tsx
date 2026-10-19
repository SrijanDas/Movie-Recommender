import { Suspense } from "react";
import { AccountButton, AccountButtonFallback } from "@/components/site/account-button";
import { Logo } from "@/components/site/logo";
import { TabBar, TabBarFallback, TopNav, TopNavFallback } from "@/components/site/tab-bar";
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

async function Account() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;
  return (
    <AccountButton name={profile?.displayName ?? user?.name ?? user?.email ?? null} avatar={profile?.avatar ?? null} />
  );
}

// Inside the app: logo, the nav on tablet and up (phones get <AppTabBar>),
// and the account avatar on every size.
export function AppHeader() {
  return (
    <Bar logoHref="/recommendations">
      <div className="flex items-center gap-3">
        <Suspense fallback={<TopNavFallback />}>
          <TopNav />
        </Suspense>
        <Suspense fallback={<AccountButtonFallback />}>
          <Account />
        </Suspense>
      </div>
    </Bar>
  );
}

export function AppTabBar() {
  return (
    <Suspense fallback={<TabBarFallback />}>
      <TabBar />
    </Suspense>
  );
}

// Outside the app (landing, sign-in, onboarding): logo and one action.
export function PlainHeader({ logoHref = "/", children }: { logoHref?: string; children?: React.ReactNode }) {
  return <Bar logoHref={logoHref}>{children}</Bar>;
}
