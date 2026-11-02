import * as motion from "framer-motion/client";
import { FilmIcon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "films", href: "/search", label: "Films", icon: FilmIcon },
  { key: "people", href: "/search/people", label: "People", icon: UsersRoundIcon },
] as const;

export type SearchTab = (typeof TABS)[number]["key"];

// What Search looks through: films (the default) or people. A segmented
// control whose active pill glides to the tab you open.
export function SearchTabs({ active }: { active: SearchTab }) {
  return (
    <nav aria-label="Search in">
      <ul className="flex w-fit gap-1 rounded-lg border border-border p-1">
        {TABS.map(({ key, href, label, icon: Icon }) => {
          const current = key === active;
          return (
            <li key={key} className="flex">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative isolate flex h-9 items-center gap-2 rounded-md px-3 text-body-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  current ? "font-medium text-ink-strong" : "text-body hover:text-ink",
                )}
              >
                {current && (
                  <motion.span
                    aria-hidden
                    layoutId="search-tabs-pill"
                    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                    className="absolute inset-0 -z-10 rounded-md bg-muted"
                  />
                )}
                <Icon className={cn("size-4", current && "text-primary")} strokeWidth={current ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
