import "server-only";
import { and, count, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { follows, listItems, listLikes, lists, profiles, tipFilms, tips } from "@/lib/db/schema";
import { resolveList } from "@/lib/lists/resolve";
import { listPath } from "@/lib/lists/rules";
import { getUserMovies } from "@/lib/movies/store";
import type { MovieSnapshot } from "@/lib/movies/types";
import { MAX_PEOPLE_RESULTS, type Person } from "./rules";

// Follows, list likes and tips in Postgres. See docs/social.md. Functions
// that act for a user take their verified id (from getCurrentUserId()).

const person = {
  userId: profiles.userId,
  handle: profiles.handle,
  displayName: profiles.displayName,
  avatar: profiles.avatar,
};

// Only people with a username (a public page) are findable.
const asPeople = (rows: { userId: string; handle: string | null; displayName: string | null; avatar: string | null }[]) =>
  rows.filter((r): r is Person => !!r.handle);

// People whose username or name contains `q`, usernames starting with it
// first. `q` is already trimmed and lowercased.
export async function searchPeople(q: string): Promise<Person[]> {
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await db
    .select(person)
    .from(profiles)
    .where(and(isNotNull(profiles.handle), or(sql`${profiles.handle} ilike ${like}`, sql`${profiles.displayName} ilike ${like}`)))
    .orderBy(sql`case when ${profiles.handle} like ${`${q}%`} then 0 else 1 end`, profiles.handle)
    .limit(MAX_PEOPLE_RESULTS);
  return asPeople(rows);
}

export async function followUser(followerId: string, followingId: string) {
  await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
}

export async function unfollowUser(followerId: string, followingId: string) {
  await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
}

export const getFollowStats = cache(async (userId: string): Promise<{ followers: number; following: number }> => {
  const [[a], [b]] = await Promise.all([
    db.select({ n: count() }).from(follows).where(eq(follows.followingId, userId)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId)),
  ]);
  return { followers: a?.n ?? 0, following: b?.n ?? 0 };
});

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const rows = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return rows.length > 0;
}

// Everyone `userId` follows, as a set of ids, for marking people lists.
export const getFollowingIds = cache(async (userId: string): Promise<Set<string>> => {
  const rows = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId));
  return new Set(rows.map((r) => r.id));
});

// Who follows `userId`, newest first.
export async function getFollowers(userId: string): Promise<Person[]> {
  const rows = await db
    .select(person)
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followerId))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt));
  return asPeople(rows);
}

// Who `userId` follows, newest first.
export const getFollowing = cache(async (userId: string): Promise<Person[]> => {
  const rows = await db
    .select(person)
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followingId))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
  return asPeople(rows);
});

export async function likeList(listId: string, userId: string) {
  await db.insert(listLikes).values({ listId, userId }).onConflictDoNothing();
}

export async function unlikeList(listId: string, userId: string) {
  await db.delete(listLikes).where(and(eq(listLikes.listId, listId), eq(listLikes.userId, userId)));
}

// Likes per list, for a shelf of cards (lists with none are left out).
export async function getListLikeCounts(listIds: string[]): Promise<Map<string, number>> {
  if (listIds.length === 0) return new Map();
  const rows = await db
    .select({ listId: listLikes.listId, n: count() })
    .from(listLikes)
    .where(inArray(listLikes.listId, listIds))
    .groupBy(listLikes.listId);
  return new Map(rows.map((r) => [r.listId, r.n]));
}

export async function getListLikes(listId: string, viewerId: string | null): Promise<{ count: number; liked: boolean }> {
  const [[row], mine] = await Promise.all([
    db.select({ n: count() }).from(listLikes).where(eq(listLikes.listId, listId)),
    viewerId
      ? db
          .select({ listId: listLikes.listId })
          .from(listLikes)
          .where(and(eq(listLikes.listId, listId), eq(listLikes.userId, viewerId)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return { count: row?.n ?? 0, liked: mine.length > 0 };
}

export type TipFilm = MovieSnapshot & { tmdbId: number };

export type TipDraft = {
  note: string | null;
  listId: string | null;
  // In order; empty for a list tip. Callers pass validated ids and snapshots.
  films: TipFilm[];
};

export async function createTip(fromUserId: string, toUserId: string, draft: TipDraft) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tips)
      .values({ fromUserId, toUserId, listId: draft.listId, note: draft.note })
      .returning({ id: tips.id });
    if (draft.films.length > 0) {
      await tx.insert(tipFilms).values(draft.films.map((f, position) => ({ tipId: row.id, position, ...f })));
    }
  });
}

// A tip as the recipient's watchlist shows it: who sent it, the note, and
// either the films or the list (its name, link, size and first posters).
export type Tip = {
  id: string;
  from: Person;
  note: string | null;
  createdAt: Date;
  seen: boolean;
  films: TipFilm[];
  list: { name: string; path: string; count: number; posters: { title: string; posterPath: string | null }[] } | null;
};

// Everything sent to `userId` that they haven't dismissed, newest first.
export const getInbox = cache(async (userId: string): Promise<Tip[]> => {
  const rows = await db
    .select({
      id: tips.id,
      note: tips.note,
      listId: tips.listId,
      createdAt: tips.createdAt,
      seenAt: tips.seenAt,
      from: person,
    })
    .from(tips)
    .innerJoin(profiles, eq(profiles.userId, tips.fromUserId))
    .where(and(eq(tips.toUserId, userId), isNull(tips.dismissedAt)))
    .orderBy(desc(tips.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const listIds = [...new Set(rows.map((r) => r.listId).filter((id): id is string => !!id))];
  const [films, listRows] = await Promise.all([
    db.select().from(tipFilms).where(inArray(tipFilms.tipId, ids)).orderBy(tipFilms.position),
    listIds.length > 0
      ? db
          .select({
            id: lists.id,
            userId: lists.userId,
            name: lists.name,
            slug: lists.slug,
            source: lists.source,
            sourceFilter: lists.sourceFilter,
            synced: lists.synced,
            handle: profiles.handle,
          })
          .from(lists)
          .innerJoin(profiles, eq(profiles.userId, lists.userId))
          .where(inArray(lists.id, listIds))
      : Promise.resolve([]),
  ]);
  // Resolve each list as its page would (synced lists follow their owner's films).
  const items = listIds.length > 0 ? await db.select().from(listItems).where(inArray(listItems.listId, listIds)).orderBy(listItems.position) : [];
  const owners = new Map<string, Awaited<ReturnType<typeof getUserMovies>>>();
  await Promise.all(
    [...new Set(listRows.map((l) => l.userId))].map(async (id) => owners.set(id, await getUserMovies(id))),
  );
  const resolved = new Map(
    listRows.map((l) => {
      const shown = resolveList(l, items.filter((i) => i.listId === l.id), owners.get(l.userId) ?? []);
      return [
        l.id,
        {
          name: l.name,
          path: l.handle ? listPath(l.handle, l.slug) : "/",
          count: shown.length,
          posters: shown.slice(0, 3).map(({ title, posterPath }) => ({ title, posterPath })),
        },
      ];
    }),
  );

  return rows
    .filter((r) => r.from.handle)
    .map((r) => ({
      id: r.id,
      from: r.from as Person,
      note: r.note,
      createdAt: r.createdAt,
      seen: !!r.seenAt,
      films: films
        .filter((f) => f.tipId === r.id)
        .map((f) => ({ tmdbId: f.tmdbId, title: f.title, posterPath: f.posterPath, year: f.year })),
      list: r.listId ? (resolved.get(r.listId) ?? null) : null,
    }))
    // A list tip whose list is gone has nothing to show.
    .filter((t) => t.films.length > 0 || t.list);
});

// Tips the recipient hasn't opened their watchlist for yet.
export const countUnseenTips = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(tips)
    .where(and(eq(tips.toUserId, userId), isNull(tips.seenAt), isNull(tips.dismissedAt)));
  return row?.n ?? 0;
});

export async function markTipsSeen(userId: string) {
  await db
    .update(tips)
    .set({ seenAt: new Date() })
    .where(and(eq(tips.toUserId, userId), isNull(tips.seenAt)));
}

export async function dismissTip(userId: string, tipId: string) {
  await db
    .update(tips)
    .set({ dismissedAt: new Date() })
    .where(and(eq(tips.id, tipId), eq(tips.toUserId, userId)));
}
