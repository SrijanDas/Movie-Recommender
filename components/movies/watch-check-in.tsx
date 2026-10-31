import { WatchCheckInSheet } from "@/components/movies/watch-check-in-sheet";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { pickCheckIn } from "@/lib/watch/check-in";

// On app open (the app layout renders once per full load), ask about the
// film the user started most recently, if one is due. Nothing to ask:
// renders nothing.
export async function WatchCheckIn() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const movie = pickCheckIn(await getUserMovies(userId));
  if (!movie) return null;
  return (
    <WatchCheckInSheet
      movie={{
        tmdbId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
        year: movie.year,
        startedVia: movie.startedVia ?? null,
      }}
    />
  );
}
