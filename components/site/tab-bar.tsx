"use client";

import { BookmarkIcon, CircleUserIcon, PopcornIcon, StarIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/recommendations", label: "Watch", icon: PopcornIcon },
  { href: "/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/my-movies", label: "My films", icon: StarIcon },
  { href: "/account", label: "Account", icon: CircleUserIcon },
];

const isActive = (pathname: string | null, href: string) =>
  pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

// The pathname is request data on dynamic routes (/movie/[id]), so both
// navs render inside <Suspense>; the fallbacks are the same links with no
// active tab.

export function TabBar() {
  return <BottomTabs pathname={usePathname()} />;
}

export function TabBarFallback() {
  return <BottomTabs pathname={null} />;
}

export function TopNav() {
  return <TopLinks pathname={usePathname()} />;
}

export function TopNavFallback() {
  return <TopLinks pathname={null} />;
}

// Phones: a bottom tab bar in thumb reach, above the home indicator.
function BottomTabs({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 text-caption outline-none transition-colors focus-visible:bg-muted active:bg-muted",
                  active ? "font-medium text-ink-strong" : "text-mute",
                )}
              >
                {/* The brand's active indicator: a short green rule on top. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-[opacity,transform] duration-200 ease-out",
                    active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                  )}
                />
                <Icon className={cn("size-5", active && "text-primary")} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Tablet and up: the same destinations inline in the top bar.
function TopLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {TABS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-body-sm outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-muted text-ink-strong" : "text-body",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
