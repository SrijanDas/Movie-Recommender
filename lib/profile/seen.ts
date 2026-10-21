import "server-only";
import { cache } from "react";
import { getUserMovies } from "@/lib/movies/store";
import { isInMyFilms, type UserMovie } from "@/lib/movies/types";
import { answerFromSlug, normalizeHandle, type SeenSlugAnswer } from "./rules";
import { getProfileByHandle, type Profile } from "./store";

// One Seen it answer's films as /@handle/seen/<slug> shows them, newest first
// (the order of the profile card). Null if the handle or slug is unknown; the
// page decides whether a hidden answer may be seen. Cached per request, so the
// page and its metadata ask once.
export const loadSeenList = cache(
  async (
    rawHandle: string,
    rawSlug: string,
  ): Promise<{ profile: Profile & { handle: string }; answer: SeenSlugAnswer; hidden: boolean; films: UserMovie[] } | null> => {
    const answer = answerFromSlug(decodeURIComponent(rawSlug).toLowerCase());
    if (!answer) return null;
    const profile = await getProfileByHandle(normalizeHandle(decodeURIComponent(rawHandle)));
    if (!profile?.handle) return null;
    const films = (await getUserMovies(profile.userId)).filter((m) => isInMyFilms(m) && m.signal === answer).reverse();
    return {
      profile: { ...profile, handle: profile.handle },
      answer,
      hidden: profile.hiddenSeen.includes(answer),
      films,
    };
  },
);
