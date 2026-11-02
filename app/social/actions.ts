"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, profiles } from "@/lib/db/schema";
import { getSnapshot, getUserMovies } from "@/lib/movies/store";
import { getProfile } from "@/lib/profile/store";
import { MAX_TIP_FILMS, MAX_TIP_NOTE, MIN_PEOPLE_QUERY, type Person } from "@/lib/social/rules";
import {
  createTip,
  dismissTip as dismissSavedTip,
  followUser,
  getFollowing,
  getFollowingIds,
  likeList,
  markTipsSeen,
  searchPeople,
  unfollowUser,
  unlikeList,
  type TipFilm,
} from "@/lib/social/store";

// Follows, list likes and tips, for the signed-in user. See docs/social.md.

type Failure = { ok: false; error: string };
export type SocialResult = { ok: true } | Failure;

const SIGN_IN_REQUIRED: Failure = { ok: false, error: "Your session ended. Sign in again." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const isTmdbId = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

function failure(error: unknown): Failure {
  console.error(error);
  return { ok: false, error: "Something went wrong. Try again." };
}

// People whose username or name matches, marked with whether you follow them.
export type FoundPerson = Person & { following: boolean };

export async function searchPeopleAction(query: unknown): Promise<FoundPerson[]> {
  const userId = await getCurrentUserId();
  if (!userId || typeof query !== "string") return [];
  const q = query.trim().replace(/^@+/, "").toLowerCase();
  if (q.length < MIN_PEOPLE_QUERY || q.length > 60) return [];
  try {
    const [people, following] = await Promise.all([searchPeople(q), getFollowingIds(userId)]);
    return people.map((p) => ({ ...p, following: following.has(p.userId) }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// The people you follow, for pickers.
export async function followingAction(): Promise<Person[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return getFollowing(userId).catch(() => []);
}

export async function setFollowing(targetId: unknown, follow: unknown): Promise<SocialResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isUuid(targetId) || typeof follow !== "boolean") return { ok: false, error: "Unknown person." };
  if (targetId === userId) return { ok: false, error: "That’s you." };
  try {
    if (follow) {
      if (!(await getProfile(targetId))?.handle) return { ok: false, error: "That person wasn’t found." };
      await followUser(userId, targetId);
    } else {
      await unfollowUser(userId, targetId);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setListLiked(listId: unknown, liked: unknown): Promise<SocialResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isUuid(listId) || typeof liked !== "boolean") return { ok: false, error: "Unknown list." };
  try {
    if (liked) {
      const [row] = await db.select({ id: lists.id }).from(lists).where(eq(lists.id, listId)).limit(1);
      if (!row) return { ok: false, error: "That list wasn’t found." };
      await likeList(listId, userId);
    } else {
      await unlikeList(listId, userId);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// Send someone a list, or one to MAX_TIP_FILMS films, with an optional note.
export async function sendTip(input: {
  toUserId: unknown;
  note: unknown;
  listId?: unknown;
  tmdbIds?: unknown;
}): Promise<SocialResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  const { toUserId, note, listId, tmdbIds } = input;
  if (!isUuid(toUserId)) return { ok: false, error: "Pick who to send it to." };
  if (toUserId === userId) return { ok: false, error: "You can’t send one to yourself." };
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length > MAX_TIP_NOTE) return { ok: false, error: `Keep the note to ${MAX_TIP_NOTE} characters.` };
  const ids = Array.isArray(tmdbIds) ? tmdbIds : [];
  const hasList = listId !== undefined && listId !== null;
  if (hasList === ids.length > 0) return { ok: false, error: "Send a film or a list." };
  if (hasList && !isUuid(listId)) return { ok: false, error: "Unknown list." };
  if (!ids.every(isTmdbId) || new Set(ids).size !== ids.length || ids.length > MAX_TIP_FILMS) {
    return { ok: false, error: `Send up to ${MAX_TIP_FILMS} different films at a time.` };
  }
  try {
    const [recipient] = await db.select({ handle: profiles.handle }).from(profiles).where(eq(profiles.userId, toUserId)).limit(1);
    if (!recipient?.handle) return { ok: false, error: "That person wasn’t found." };
    let films: TipFilm[] = [];
    if (hasList) {
      const [row] = await db.select({ id: lists.id }).from(lists).where(eq(lists.id, listId as string)).limit(1);
      if (!row) return { ok: false, error: "That list wasn’t found." };
    } else {
      // Snapshots from the sender's own list where possible, else the database.
      const mine = await getUserMovies(userId);
      const snapshots = await Promise.all(
        ids.map(async (tmdbId) => {
          const known = mine.find((m) => m.tmdbId === tmdbId);
          const s = known ? { title: known.title, posterPath: known.posterPath, year: known.year } : await getSnapshot(tmdbId);
          return s && { tmdbId, ...s };
        }),
      );
      if (snapshots.some((s) => !s)) return { ok: false, error: "One of those films couldn’t be found." };
      films = snapshots as TipFilm[];
    }
    await createTip(userId, toUserId, { note: text || null, listId: hasList ? (listId as string) : null, films });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function dismissTip(tipId: unknown): Promise<SocialResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isUuid(tipId)) return { ok: false, error: "Unknown tip." };
  try {
    await dismissSavedTip(userId, tipId);
    revalidatePath("/watchlist");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// The recipient opened their watchlist: the badge clears.
export async function markInboxSeen(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  try {
    await markTipsSeen(userId);
    revalidatePath("/", "layout");
  } catch (error) {
    console.error(error);
  }
}
