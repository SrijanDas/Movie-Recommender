"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { cn } from "@/lib/utils";

// The header's way into the Profile page, on every screen size. The avatar
// is 32px; the link around it is a 44px tap target.
export function AccountButton({ name, avatar }: { name: string | null; avatar: string | null }) {
  const active = usePathname()?.startsWith("/account") ?? false;
  return <AccountLink name={name} avatar={avatar} active={active} />;
}

export function AccountButtonFallback() {
  return <AccountLink name={null} avatar={null} active={false} />;
}

function AccountLink({ name, avatar, active }: { name: string | null; avatar: string | null; active: boolean }) {
  return (
    <Link
      href="/account"
      aria-label="Profile"
      aria-current={active ? "page" : undefined}
      className="group/account -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none"
    >
      <ProfileAvatar
        avatar={avatar}
        name={name}
        className={cn(
          "transition-shadow duration-200 ease-out group-hover/account:ring-2 group-hover/account:ring-hairline-soft/50 group-focus-visible/account:ring-3 group-focus-visible/account:ring-ring/50",
          active && "ring-2 ring-primary group-hover/account:ring-primary",
        )}
      />
    </Link>
  );
}
