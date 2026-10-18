"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Pick films", short: "Pick" },
  { href: "/recommendations", label: "What to watch", short: "Watch" },
  { href: "/my-movies", label: "My films", short: "Mine" },
];

// The pathname is request data on dynamic routes (/movie/[id]), so the header
// renders NavLinks inside <Suspense> with this fallback: same links, no
// active underline.
export function NavLinksFallback() {
  return <Links pathname={null} />;
}

export function NavLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-4 text-body-sm">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 py-1 transition-colors hover:text-ink",
              active ? "text-ink-strong underline decoration-primary decoration-2 underline-offset-[18px]" : "text-body",
            )}
          >
            <span className="sm:hidden">{item.short}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
