import { Suspense } from "react";
import { Logo } from "@/components/site/logo";
import { TabBar, TabBarFallback, TopNav, TopNavFallback } from "@/components/site/tab-bar";

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

// Inside the app: logo, plus the nav on tablet and up. Phones get <AppTabBar>.
export function AppHeader() {
  return (
    <Bar logoHref="/recommendations">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
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

// TMDB's terms require this attribution to stay visible.
export function TmdbAttribution({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-caption text-mute"}>
      Film data and posters from{" "}
      <a href="https://www.themoviedb.org/" className="text-primary-deep underline" target="_blank" rel="noreferrer">
        TMDB
      </a>
      . This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
  );
}
