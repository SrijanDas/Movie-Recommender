"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { sourceFilms, type ListFilm } from "@/lib/lists/resolve";
import { LIST_SOURCES, listPath, MAX_LIST_FILMS, MAX_LIST_NAME, type ListSource } from "@/lib/lists/rules";
import { deleteList, getList, saveList } from "@/lib/lists/store";
import { getSnapshot, getUserMovies } from "@/lib/movies/store";
import { isMyFilmsFilter } from "@/lib/movies/types";
import { getProfile } from "@/lib/profile/store";

// Shared lists: save (create or edit) and delete. See docs/lists.md.

type Failure = { ok: false; error: string };
export type SaveListResult = { ok: true; id: string | null; path: string } | Failure;

const fail = (error: string): Failure => ({ ok: false, error });

const isTmdbId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const isIdList = (ids: unknown): ids is number[] =>
  Array.isArray(ids) && ids.every(isTmdbId) && new Set(ids).size === ids.length;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export type ListInput = {
  id?: string;
  name: string;
  source: ListSource | null;
  filter: string | null;
  synced: boolean;
  // The films shown, in order.
  ids: number[];
  // Synced lists: source films the owner took out.
  hiddenIds: number[];
};

export async function saveListAction(input: unknown): Promise<SaveListResult> {
  const userId = await getCurrentUserId();
  if (!userId) return fail("Your session ended. Sign in again.");
  const { id, name, source, filter, synced, ids, hiddenIds } = (input ?? {}) as Partial<ListInput>;

  const title = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!title) return fail("Give your list a name.");
  if (title.length > MAX_LIST_NAME) return fail(`Keep the name under ${MAX_LIST_NAME} characters.`);
  if (id !== undefined && !isUuid(id)) return fail("That list wasn’t found.");
  if (source !== null && !LIST_SOURCES.includes(source as ListSource)) return fail("That list wasn’t found.");
  if (!isIdList(ids) || !isIdList(hiddenIds) || typeof synced !== "boolean") return fail("Something went wrong. Try again.");
  if (ids.length === 0) return fail("Add at least one film.");
  if (ids.length > MAX_LIST_FILMS) return fail(`A list holds up to ${MAX_LIST_FILMS} films.`);

  const settings = {
    source: source ?? null,
    sourceFilter: source === "my_films" && isMyFilmsFilter(filter) ? filter : null,
    synced: synced && source != null,
  };

  try {
    const profile = await getProfile(userId);
    if (!profile?.handle) return fail("Pick a username first, on your Profile.");
    const [movies, existing] = await Promise.all([getUserMovies(userId), id ? getList(userId, id) : null]);
    if (id && !existing) return fail("That list wasn’t found.");

    // Snapshots for display: from the user's own films or the list as saved,
    // else from the movie database (which also checks the id is real).
    const known = new Map<number, ListFilm>();
    for (const f of existing?.items ?? []) known.set(f.tmdbId, f);
    for (const m of movies) known.set(m.tmdbId, m);
    const missing = ids.filter((tmdbId) => !known.has(tmdbId));
    const fetched = await Promise.all(missing.map(getSnapshot));
    for (const [i, snap] of fetched.entries()) {
      if (!snap) return fail("One of those films couldn’t be found.");
      known.set(missing[i], { tmdbId: missing[i], ...snap });
    }

    // In a synced list a film outside the source was added by the owner, and
    // a source film left out is hidden, so the list remembers both edits.
    const inSource = new Set(sourceFilms(movies, settings.source, settings.sourceFilter).map((f) => f.tmdbId));
    const shown = new Set(ids);
    const snapshot = (tmdbId: number) => {
      const { title, posterPath, year } = known.get(tmdbId)!;
      return { tmdbId, title, posterPath, year };
    };
    const items = [
      ...ids.map((tmdbId) => ({ ...snapshot(tmdbId), hidden: false, added: settings.synced && !inSource.has(tmdbId) })),
      ...(settings.synced
        ? hiddenIds
            .filter((tmdbId) => inSource.has(tmdbId) && !shown.has(tmdbId) && known.has(tmdbId))
            .map((tmdbId) => ({ ...snapshot(tmdbId), hidden: true, added: false }))
        : []),
    ];

    const slug = await saveList(userId, id ?? null, { name: title, ...settings, items });
    if (!slug) return fail("That list wasn’t found.");
    revalidatePath("/", "layout");
    return { ok: true, id: id ?? null, path: listPath(profile.handle, slug) };
  } catch (error) {
    console.error(error);
    return fail("We couldn’t save your list. Try again.");
  }
}

export async function deleteListAction(id: unknown): Promise<{ ok: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId || !isUuid(id)) return { ok: false };
  try {
    await deleteList(userId, id);
  } catch (error) {
    console.error(error);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
