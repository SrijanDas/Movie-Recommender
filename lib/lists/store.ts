import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { listItems, lists } from "@/lib/db/schema";
import type { ListItem, ListSettings } from "./resolve";
import { freeSlug, slugify } from "./rules";

// Shared lists in Postgres. See docs/lists.md. Functions that change a list
// take the owner's verified user id (from getCurrentUserId()) and only touch
// that user's lists; the readers are public, for /@handle pages.

export type SharedList = ListSettings & {
  id: string;
  userId: string;
  name: string;
  slug: string;
  items: ListItem[];
};

const listColumns = {
  id: lists.id,
  userId: lists.userId,
  name: lists.name,
  slug: lists.slug,
  source: lists.source,
  sourceFilter: lists.sourceFilter,
  synced: lists.synced,
};

const itemColumns = {
  listId: listItems.listId,
  tmdbId: listItems.tmdbId,
  position: listItems.position,
  hidden: listItems.hidden,
  added: listItems.added,
  title: listItems.title,
  posterPath: listItems.posterPath,
  year: listItems.year,
};

async function withItems(rows: Omit<SharedList, "items">[]): Promise<SharedList[]> {
  if (rows.length === 0) return [];
  const items = await db
    .select(itemColumns)
    .from(listItems)
    .where(
      inArray(
        listItems.listId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(listItems.position));
  return rows.map((r) => ({
    ...r,
    items: items
      .filter((i) => i.listId === r.id)
      .map((i) => ({
        tmdbId: i.tmdbId,
        position: i.position,
        hidden: i.hidden,
        added: i.added,
        title: i.title,
        posterPath: i.posterPath,
        year: i.year,
      })),
  }));
}

// Every list a user has made, newest first.
export const getUserLists = cache(async (userId: string): Promise<SharedList[]> => {
  const rows = await db.select(listColumns).from(lists).where(eq(lists.userId, userId)).orderBy(desc(lists.createdAt));
  return withItems(rows);
});

export const getListBySlug = cache(async (userId: string, slug: string): Promise<SharedList | null> => {
  const rows = await db
    .select(listColumns)
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.slug, slug)))
    .limit(1);
  return (await withItems(rows))[0] ?? null;
});

export async function getList(userId: string, id: string): Promise<SharedList | null> {
  const rows = await db
    .select(listColumns)
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.id, id)))
    .limit(1);
  return (await withItems(rows))[0] ?? null;
}

export type ListDraft = ListSettings & {
  name: string;
  // In order; position is the index. Callers pass validated ids and snapshots.
  items: Omit<ListItem, "position">[];
};

// Create a list (no id) or overwrite one of the user's lists, items and all,
// in one transaction. Returns its slug, or null if `id` isn't theirs.
export async function saveList(userId: string, id: string | null, draft: ListDraft): Promise<string | null> {
  return db.transaction(async (tx) => {
    const settings = {
      name: draft.name,
      source: draft.source,
      sourceFilter: draft.sourceFilter,
      synced: draft.synced,
    };
    let row: { id: string; slug: string } | undefined;
    if (id) {
      [row] = await tx
        .update(lists)
        .set(settings)
        .where(and(eq(lists.id, id), eq(lists.userId, userId)))
        .returning({ id: lists.id, slug: lists.slug });
      if (!row) return null;
      await tx.delete(listItems).where(eq(listItems.listId, row.id));
    } else {
      const taken = await tx.select({ slug: lists.slug }).from(lists).where(eq(lists.userId, userId));
      const slug = freeSlug(slugify(draft.name), new Set(taken.map((t) => t.slug)));
      [row] = await tx.insert(lists).values({ userId, slug, ...settings }).returning({ id: lists.id, slug: lists.slug });
    }
    if (draft.items.length > 0) {
      const listId = row.id;
      await tx.insert(listItems).values(draft.items.map((item, position) => ({ listId, position, ...item })));
    }
    return row.slug;
  });
}

export async function deleteList(userId: string, id: string) {
  await db.delete(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));
}
