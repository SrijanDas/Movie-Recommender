import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { profilePath } from "@/lib/profile/rules";
import type { Person } from "@/lib/social/rules";
import { cn } from "@/lib/utils";

// Someone in a list: their picture, name and username, opening their
// profile; `children` (a Follow button) sits at the end.
export function PersonRow({ person, children, className }: { person: Person; children?: React.ReactNode; className?: string }) {
  const name = person.displayName ?? person.handle;
  return (
    <li className={cn("flex items-center gap-3 py-2.5", className)}>
      <Link
        href={profilePath(person.handle)}
        className="group/person flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProfileAvatar avatar={person.avatar} name={name} className="size-11 shrink-0" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body-md text-ink transition-colors group-hover/person:text-primary-soft">{name}</span>
          <span className="truncate text-caption text-mute">@{person.handle}</span>
        </span>
      </Link>
      {children && <span className="flex shrink-0 items-center">{children}</span>}
    </li>
  );
}

export const PEOPLE_LIST = "flex flex-col divide-y divide-border";
