"use client";

import { BookmarkIcon, PlusIcon, SquarePenIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Where a new list can start: the same three entry points as the Watchlist
// Share button, the My films Share icon and the shelf's "New list" tile.
const STARTS = [
  { href: "/lists/new?from=watchlist", label: "From your watchlist", hint: "Films saved for later", icon: BookmarkIcon },
  { href: "/lists/new?from=my-films&filter=all", label: "From My films", hint: "Everything you've seen", icon: StarIcon },
  { href: "/lists/new", label: "Start empty", hint: "Any films, your order", icon: SquarePenIcon },
];

// The Lists heading's "New list" action on your own profile.
export function NewListMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="lg"
            className="-mr-2 shrink-0 px-2 text-body-sm text-body hover:text-ink aria-expanded:bg-muted aria-expanded:text-ink"
          />
        }
      >
        <PlusIcon />
        New list
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-caption text-mute">Start a list</DropdownMenuLabel>
          {STARTS.map(({ href, label, hint, icon: Icon }) => (
            <DropdownMenuLinkItem key={href} render={<Link href={href} />} className="min-h-12 gap-3 py-1.5 pl-2">
              <Icon className="text-mute" />
              <span className="flex flex-col">
                <span className="text-body-sm text-ink">{label}</span>
                <span className="text-caption text-mute">{hint}</span>
              </span>
            </DropdownMenuLinkItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
