"use client";

import { motion } from "framer-motion";
import { BookmarkIcon, PopcornIcon, SearchIcon, StarIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { cn } from "@/lib/utils";

export const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/recommendations", label: "Watch", icon: PopcornIcon },
  { href: "/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/my-movies", label: "My films", icon: StarIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
];

// Phones swap Search for Profile: Search sits in the header there, and
// Profile takes the last tab, drawn as your picture (on tablet and up it's
// the header avatar).
const BOTTOM_TABS = [
  ...TABS.filter(({ href }) => href !== "/search"),
  { href: "/account", label: "Profile", icon: UserRoundIcon },
];

const TAB_SLIDE = { type: "spring", bounce: 0, duration: 0.35 } as const;

const isActive = (pathname: string | null, href: string) =>
  pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

// The pathname is request data on dynamic routes (/movie/[id]), so both
// navs render inside <Suspense>; the fallbacks are the same links with no
// active tab.

type Me = { name: string | null; avatar: string | null };

export function TabBar({ me }: { me: Me }) {
  return <BottomTabs pathname={usePathname()} me={me} />;
}

export function TabBarFallback() {
  return <BottomTabs pathname={null} me={{ name: null, avatar: null }} />;
}

export function TopNav() {
  return <TopLinks pathname={usePathname()} />;
}

export function TopNavFallback() {
  return <TopLinks pathname={null} />;
}

export function SearchButton() {
  return <SearchLink active={isActive(usePathname(), "/search")} />;
}

export function SearchButtonFallback() {
  return <SearchLink active={false} />;
}

// Phones: a bottom tab bar in thumb reach, above the home indicator.
function BottomTabs({ pathname, me }: { pathname: string | null; me: Me }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
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
                {/* The brand's active indicator: a short green rule on top that
                    slides across to the tab you open. */}
                {active && (
                  <motion.span
                    aria-hidden
                    layoutId="tab-bar-indicator"
                    transition={TAB_SLIDE}
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  />
                )}
                {href === "/account" ? (
                  <ProfileAvatar
                    avatar={me.avatar}
                    name={me.name}
                    className={cn("size-6 transition-shadow duration-200 ease-out", active && "ring-2 ring-primary")}
                  />
                ) : (
                  <Icon className={cn("size-5", active && "text-primary")} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                )}
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
    <nav aria-label="Main" className="isolate hidden items-center gap-1 md:flex">
      {TABS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-body-sm outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "text-ink-strong" : "text-body",
            )}
          >
            {/* The active pill glides to the link you open. */}
            {active && (
              <motion.span
                aria-hidden
                layoutId="top-nav-pill"
                transition={TAB_SLIDE}
                className="absolute inset-0 -z-10 rounded-lg bg-muted"
              />
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Phones: Search in the header, where the avatar sits on tablet and up. A
// 44px tap target, green while on /search.
function SearchLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/search"
      aria-label="Search"
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted md:hidden",
        active ? "text-primary" : "text-body",
      )}
    >
      <SearchIcon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
    </Link>
  );
}
