"use client";

import { CircleUserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Up to two initials from the display name, else the email's first letter.
function initialsFor(name: string | null, email: string | null) {
  const words = name?.split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? null;
}

// The header's way into Account, on every screen size. The avatar is 32px;
// the link around it is a 44px tap target.
export function AccountButton({ name, email }: { name: string | null; email: string | null }) {
  const active = usePathname()?.startsWith("/account") ?? false;
  return <AccountLink initials={initialsFor(name, email)} active={active} />;
}

export function AccountButtonFallback() {
  return <AccountLink initials={null} active={false} />;
}

function AccountLink({ initials, active }: { initials: string | null; active: boolean }) {
  return (
    <Link
      href="/account"
      aria-label="Account"
      aria-current={active ? "page" : undefined}
      className="group/account -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none"
    >
      <Avatar
        className={cn(
          "transition-shadow duration-200 ease-out group-hover/account:ring-2 group-hover/account:ring-hairline-soft/50 group-focus-visible/account:ring-3 group-focus-visible/account:ring-ring/50",
          active && "ring-2 ring-primary group-hover/account:ring-primary",
        )}
      >
        <AvatarFallback
          className={cn(
            "bg-canvas-soft text-caption font-semibold text-ink",
            active && "text-primary",
          )}
        >
          {initials ?? <CircleUserIcon className="size-4" strokeWidth={1.75} aria-hidden />}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}
