// A profile picture is stored as one string in profiles.avatar. Pure — safe
// on server and client.
//
// - "upload:avatars/<user id>/<file>.jpg": a photo in the public "files"
//   Storage bucket (see drizzle/0010_avatar_storage_policies.sql)
// - "poster:/abc.jpg": a TMDB poster, cropped to its top
// - "icon:popcorn": one of AVATAR_ICONS
// - null: the user's initials

import { posterUrl } from "@/lib/tmdb/images";

export const AVATAR_BUCKET = "files";
// Uploads are cropped to a square and re-encoded in the browser first.
export const AVATAR_PX = 512;
export const MAX_AVATAR_BYTES = 1024 * 1024;

export const AVATAR_ICONS = [
  "popcorn",
  "clapperboard",
  "film",
  "ticket",
  "projector",
  "video",
  "drama",
  "armchair",
  "glasses",
  "camera",
  "star",
  "sparkles",
] as const;
export type AvatarIcon = (typeof AVATAR_ICONS)[number];

export type Avatar =
  | { kind: "upload"; path: string }
  | { kind: "poster"; path: string }
  | { kind: "icon"; icon: AvatarIcon }
  | null;

export function parseAvatar(value: string | null | undefined): Avatar {
  if (!value) return null;
  const [kind, ...rest] = value.split(":");
  const arg = rest.join(":");
  if (kind === "upload" && arg.startsWith("avatars/")) return { kind, path: arg };
  if (kind === "poster" && /^\/[\w.-]+$/.test(arg)) return { kind, path: arg };
  if (kind === "icon" && (AVATAR_ICONS as readonly string[]).includes(arg)) return { kind, icon: arg as AvatarIcon };
  return null;
}

export function serializeAvatar(avatar: Avatar): string | null {
  if (!avatar) return null;
  return avatar.kind === "icon" ? `icon:${avatar.icon}` : `${avatar.kind}:${avatar.path}`;
}

// The image to show for an avatar, or null for icons and initials.
export function avatarImageUrl(avatar: Avatar): string | null {
  if (avatar?.kind === "upload") {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${avatar.path}`;
  }
  if (avatar?.kind === "poster") return posterUrl(avatar.path, "w342");
  return null;
}

// Up to two initials from a name.
export function initialsOf(name: string | null | undefined): string | null {
  const words = name?.split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return null;
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}
