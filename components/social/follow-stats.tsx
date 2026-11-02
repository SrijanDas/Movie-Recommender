import Link from "next/link";
import { followersPath, followingPath } from "@/lib/social/rules";

const LINK = "rounded-md outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50";

// "12 followers · 8 following", each opening its list.
export function FollowStats({ handle, followers, following }: { handle: string; followers: number; following: number }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-body-md text-body">
      <Link href={followersPath(handle)} className={LINK}>
        <span className="font-mono text-ink tabular-nums">{followers}</span> {followers === 1 ? "follower" : "followers"}
      </Link>
      <span aria-hidden className="text-mute">·</span>
      <Link href={followingPath(handle)} className={LINK}>
        <span className="font-mono text-ink tabular-nums">{following}</span> following
      </Link>
    </p>
  );
}
