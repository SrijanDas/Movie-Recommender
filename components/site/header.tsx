import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { ImportLocalList } from "@/components/movies/import-local-list";
import { NavLinks, NavLinksFallback } from "@/components/site/nav-links";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/auth";

async function Account() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <Button variant="outline" size="sm" className="h-8" render={<Link href="/sign-in" />} nativeButton={false}>
        Sign in
      </Button>
    );
  }
  return (
    <form action={signOut}>
      <ImportLocalList />
      <Button type="submit" variant="ghost" size="sm" className="h-8 text-body">
        Sign out
      </Button>
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 md:px-8">
        <Link href="/" aria-label="Next Reel home" className="flex shrink-0 items-center gap-2 text-body-md font-semibold text-ink-strong">
          <span aria-hidden className="grid size-6 place-items-center rounded-sm bg-primary font-mono text-code font-bold text-primary-foreground">
            5
          </span>
          <span className="hidden sm:inline">Next Reel</span>
        </Link>
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
        <Suspense fallback={<div className="h-8 w-16" />}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-dashed border-[rgba(79,93,117,0.4)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-body-sm text-mute md:px-8">
        <p>
          Film data and posters from{" "}
          <a href="https://www.themoviedb.org/" className="text-primary-deep underline" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
