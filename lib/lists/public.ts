import "server-only";
import { cache } from "react";
import { getUserMovies } from "@/lib/movies/store";
import { normalizeHandle } from "@/lib/profile/rules";
import { getProfileByHandle, type Profile } from "@/lib/profile/store";
import { resolveList, type ListFilm } from "./resolve";
import { getListBySlug, getUserLists, type SharedList } from "./store";
import { listPath } from "./rules";

// A list as /@handle/lists/<slug> shows it: its owner and its films right
// now. Null if either is unknown. Cached per request, so the page, its
// metadata and its share image ask once.
export const loadSharedList = cache(
  async (
    rawHandle: string,
    rawSlug: string,
  ): Promise<{ profile: Profile & { handle: string }; list: SharedList; films: ListFilm[] } | null> => {
    const handle = normalizeHandle(decodeURIComponent(rawHandle));
    const profile = await getProfileByHandle(handle);
    if (!profile?.handle) return null;
    const list = await getListBySlug(profile.userId, decodeURIComponent(rawSlug).toLowerCase());
    if (!list) return null;
    const films = resolveList(list, list.items, await getUserMovies(profile.userId));
    return { profile: { ...profile, handle: profile.handle }, list, films };
  },
);

// A card for each of a user's lists, newest first: name, link, size and the
// first three posters.
export type ListCard = {
  id: string;
  name: string;
  path: string;
  count: number;
  synced: boolean;
  posters: { title: string; posterPath: string | null }[];
};

export async function getListCards(userId: string, handle: string): Promise<ListCard[]> {
  const [lists, movies] = await Promise.all([getUserLists(userId), getUserMovies(userId)]);
  return lists.map((list) => {
    const films = resolveList(list, list.items, movies);
    return {
      id: list.id,
      name: list.name,
      path: listPath(handle, list.slug),
      count: films.length,
      synced: list.synced,
      posters: films.slice(0, 3).map(({ title, posterPath }) => ({ title, posterPath })),
    };
  });
}
