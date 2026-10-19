import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { handleCandidates, handleProblem } from "./rules";

// Profiles in Postgres. Functions that take a user id must get it from
// getCurrentUserId() (or a fresh sign-up); getProfileByHandle is public.

export type Profile = {
  userId: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  // "Seen it" answers whose lists stay off the public profile.
  hiddenSeen: string[];
};

const columns = {
  userId: profiles.userId,
  handle: profiles.handle,
  displayName: profiles.displayName,
  bio: profiles.bio,
  avatar: profiles.avatar,
  hiddenSeen: profiles.hiddenSeen,
};

// Cached per request, so the header and the page can both ask.
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const [row] = await db.select(columns).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
});

export const getProfileByHandle = cache(async (handle: string): Promise<Profile | null> => {
  const [row] = await db.select(columns).from(profiles).where(eq(profiles.handle, handle)).limit(1);
  return row ?? null;
});

// Whether someone other than `exceptUserId` holds this (normalized) handle.
export async function isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(exceptUserId ? and(eq(profiles.handle, handle), ne(profiles.userId, exceptUserId)) : eq(profiles.handle, handle))
    .limit(1);
  return rows.length > 0;
}

// The first free handle for a name: its plain forms, then with digits.
export async function suggestHandle(name: string, exceptUserId?: string): Promise<string> {
  const candidates = handleCandidates(name);
  const base = candidates[0] ?? "filmfan";
  const numbered = Array.from({ length: 6 }, (_, i) => {
    const digits = String(Math.floor(10 ** (i < 3 ? 2 : 4) * Math.random())).padStart(2, "0");
    return base.slice(0, 20 - digits.length) + digits;
  });
  const options = [...candidates, ...numbered].filter((h) => !handleProblem(h));
  const taken = await db
    .select({ handle: profiles.handle, userId: profiles.userId })
    .from(profiles)
    .where(inArray(profiles.handle, options));
  const busy = new Set(taken.filter((t) => t.userId !== exceptUserId).map((t) => t.handle));
  return options.find((h) => !busy.has(h)) ?? `${base.slice(0, 12)}${Date.now() % 1e8}`;
}

// Postgres unique_violation, e.g. two people saving the same handle at once.
export const isHandleConflict = (error: unknown) =>
  error instanceof Error && (error.cause as { code?: string } | undefined)?.code === "23505";

// A new account's row: reserves the handle before onboarding.
export async function createProfile(userId: string, handle: string, displayName: string) {
  await db
    .insert(profiles)
    .values({ userId, handle, displayName, onboardedAt: null })
    .onConflictDoUpdate({ target: profiles.userId, set: { handle, displayName } });
}

export async function updateProfile(
  userId: string,
  fields: Pick<Profile, "handle" | "displayName" | "bio" | "avatar">,
) {
  await db
    .insert(profiles)
    .values({ userId, ...fields })
    .onConflictDoUpdate({ target: profiles.userId, set: fields });
}

// Which "Seen it" answers stay off the public profile.
export async function setHiddenSeen(userId: string, hiddenSeen: string[]) {
  await db.update(profiles).set({ hiddenSeen }).where(eq(profiles.userId, userId));
}
