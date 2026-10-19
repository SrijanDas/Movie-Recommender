"use client";

import { CircleUserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarImageUrl, initialsOf, parseAvatar } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

// Someone's picture: their photo, a generated avatar, or initials. Size it
// with `className` (e.g. "size-24"); initials scale with it through
// container query units.
export function ProfileAvatar({
  avatar,
  name,
  className,
  preload,
}: {
  avatar: string | null;
  name: string | null;
  className?: string;
  preload?: boolean;
}) {
  const src = avatarImageUrl(parseAvatar(avatar));
  const initials = initialsOf(name);
  return (
    <Avatar className={cn("@container size-8", className)}>
      {src && <AvatarImage src={src} alt="" loading={preload ? "eager" : "lazy"} />}
      <AvatarFallback className="bg-canvas-soft font-semibold text-ink text-[clamp(0.75rem,38cqi,3rem)] tracking-[-0.02em]">
        {initials ?? <CircleUserIcon className="size-[55cqi] text-mute" strokeWidth={1.5} aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}
