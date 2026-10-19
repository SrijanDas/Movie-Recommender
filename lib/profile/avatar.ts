// A profile picture is stored as one string in profiles.avatar. Pure — safe
// on server and client.
//
// - "upload:avatars/<user id>/<file>.jpg": a photo in the public "files"
//   Storage bucket (see drizzle/0010_avatar_storage_policies.sql)
// - "gen:<seed>": a generated avatar (DiceBear's Lorelei style, CC0)
// - null: the user's initials

export const AVATAR_BUCKET = "files";
// Uploads are cropped to a square and re-encoded in the browser first.
export const AVATAR_PX = 512;
export const MAX_AVATAR_BYTES = 1024 * 1024;

// Soft mints and greys, so generated faces sit on the dark brand.
const GEN_BACKGROUNDS = "d1fae5,a7f3d0,c7f0e0,e5e7eb,f2f2f2";

export type Avatar = { kind: "upload"; path: string } | { kind: "gen"; seed: string } | null;

export function parseAvatar(value: string | null | undefined): Avatar {
  if (!value) return null;
  const [kind, ...rest] = value.split(":");
  const arg = rest.join(":");
  if (kind === "upload" && arg.startsWith("avatars/")) return { kind, path: arg };
  if (kind === "gen" && /^[a-z0-9]{4,24}$/.test(arg)) return { kind, seed: arg };
  return null;
}

export function serializeAvatar(avatar: Avatar): string | null {
  if (!avatar) return null;
  return avatar.kind === "gen" ? `gen:${avatar.seed}` : `upload:${avatar.path}`;
}

// A fresh seed for a generated avatar.
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(6, "0");
}

// A generated avatar's image. SVG in the app; PNG for the share image,
// which can't draw remote SVGs reliably.
export function generatedAvatarUrl(seed: string, format: "svg" | "png" = "svg") {
  const size = format === "png" ? "&size=256" : "";
  return `https://api.dicebear.com/9.x/lorelei/${format}?seed=${seed}&backgroundColor=${GEN_BACKGROUNDS}${size}`;
}

// The image to show for an avatar, or null for initials.
export function avatarImageUrl(avatar: Avatar, format: "svg" | "png" = "svg"): string | null {
  if (avatar?.kind === "upload") {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${avatar.path}`;
  }
  if (avatar?.kind === "gen") return generatedAvatarUrl(avatar.seed, format);
  return null;
}

// Up to two initials from a name.
export function initialsOf(name: string | null | undefined): string | null {
  const words = name?.split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return null;
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}
