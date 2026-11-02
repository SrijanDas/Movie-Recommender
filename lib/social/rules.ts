// Limits and paths for the social layer. Pure — safe on server and client.

export const MAX_TIP_NOTE = 140;
export const MAX_TIP_FILMS = 20;
export const MAX_PEOPLE_RESULTS = 20;
export const MIN_PEOPLE_QUERY = 2;

export const followersPath = (handle: string) => `/@${handle}/followers`;
export const followingPath = (handle: string) => `/@${handle}/following`;

// Someone as they show in a people list.
export type Person = {
  userId: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
};

// "just now", "5m", "3h", "2d", "3w", then the date. For a tip's byline.
export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d`;
  if (d < 35) return `${Math.floor(d / 7)}w`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
