import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { memories, userMovies } from "@/lib/db/schema";
import { isOnThisDay, onThisDay, recap, recapsDue } from "./pick";
import type { Memory, MemoryFilm } from "./types";

// Queue the memories due on `today` for every user, and read them back for
// delivery. Run once a day by app/api/cron/memories. See docs/memories.md.

type Row = typeof userMovies.$inferSelect;

const toFilm = (r: Row): MemoryFilm => ({
  tmdbId: r.tmdbId,
  title: r.title,
  posterPath: r.posterPath,
  year: r.year,
  watchedAt: r.watchedAt!.toISOString(),
  answer: r.signal === "favorite" ? r.seenSignal : r.signal,
  favorite: r.signal === "favorite",
});

function byUser(rows: Row[]): Map<string, MemoryFilm[]> {
  const users = new Map<string, MemoryFilm[]>();
  for (const r of rows) {
    const films = users.get(r.userId) ?? [];
    films.push(toFilm(r));
    users.set(r.userId, films);
  }
  return users;
}

// Films watched on this month and day (or 29 February, which counts on 28
// February in other years) in an earlier year; isOnThisDay settles the rest.
async function onThisDayRows(today: Date): Promise<Row[]> {
  const month = today.getUTCMonth() + 1;
  const days = month === 2 && today.getUTCDate() === 28 ? [28, 29] : [today.getUTCDate()];
  const watched = sql`${userMovies.watchedAt} at time zone 'UTC'`;
  const rows = await db
    .select()
    .from(userMovies)
    .where(
      and(
        isNotNull(userMovies.watchedAt),
        sql`extract(month from ${watched}) = ${month}`,
        sql`extract(day from ${watched}) in ${days}`,
        sql`extract(year from ${watched}) < ${today.getUTCFullYear()}`,
      ),
    );
  return rows.filter((r) => isOnThisDay(r.watchedAt!, today));
}

const watchedIn = ([start, end]: [Date, Date]) =>
  db
    .select()
    .from(userMovies)
    .where(and(gte(userMovies.watchedAt, start), lt(userMovies.watchedAt, end)));

// Work out every memory due on `today` (a UTC day) and queue it. Safe to run
// more than once a day: a memory already queued is left as it is.
export async function queueMemories(today = new Date()): Promise<{ queued: number }> {
  const due: (Memory & { userId: string })[] = [];

  for (const [userId, films] of byUser(await onThisDayRows(today))) {
    const memory = onThisDay(films, today);
    if (memory) due.push({ ...memory, userId });
  }
  for (const { kind, period, range } of recapsDue(today)) {
    for (const [userId, films] of byUser(await watchedIn(range))) {
      const memory = recap(films, kind, period, range);
      if (memory) due.push({ ...memory, userId });
    }
  }

  if (due.length === 0) return { queued: 0 };
  const inserted = await db
    .insert(memories)
    .values(due.map(({ userId, kind, period, films }) => ({ userId, kind, period, films })))
    .onConflictDoNothing()
    .returning({ id: memories.id });
  return { queued: inserted.length };
}

export type QueuedMemory = Memory & { id: string; userId: string; createdAt: Date };

// The oldest memories not yet sent, for a delivery channel to send.
export async function getUnsentMemories(limit = 500): Promise<QueuedMemory[]> {
  return db
    .select({
      id: memories.id,
      userId: memories.userId,
      kind: memories.kind,
      period: memories.period,
      films: memories.films,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(isNull(memories.sentAt))
    .orderBy(asc(memories.createdAt))
    .limit(limit);
}

export async function markMemoriesSent(ids: string[]) {
  if (ids.length === 0) return;
  await db.update(memories).set({ sentAt: new Date() }).where(inArray(memories.id, ids));
}

// One user's memories, newest first, for an in-app view. Callers pass the
// id from getCurrentUserId().
export async function getMemories(userId: string, limit = 50): Promise<(QueuedMemory & { readAt: Date | null })[]> {
  return db
    .select({
      id: memories.id,
      userId: memories.userId,
      kind: memories.kind,
      period: memories.period,
      films: memories.films,
      createdAt: memories.createdAt,
      readAt: memories.readAt,
    })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(limit);
}

export async function markMemoryRead(userId: string, id: string) {
  await db
    .update(memories)
    .set({ readAt: new Date() })
    .where(and(eq(memories.userId, userId), eq(memories.id, id), isNull(memories.readAt)));
}
