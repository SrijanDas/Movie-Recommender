import { isWatching, type WatchProgress } from "@/lib/movies/types";
import type { RatedMovie } from "@/lib/recommend/types";

// The check-in: when the app opens, ask about the film the user started most
// recently. It waits for a film's length to pass before asking, and a day
// after "Still watching" before asking about that film again.
export const MIN_SINCE_START_MS = 90 * 60 * 1000;
export const NUDGE_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function pickCheckIn<T extends RatedMovie & WatchProgress>(movies: T[], now = new Date()): T | null {
  const due = movies.filter(
    (m) =>
      isWatching(m) &&
      now.getTime() - m.startedAt!.getTime() >= MIN_SINCE_START_MS &&
      (!m.nudgedAt || now.getTime() - m.nudgedAt.getTime() >= NUDGE_SNOOZE_MS),
  );
  due.sort((a, b) => b.startedAt!.getTime() - a.startedAt!.getTime());
  return due[0] ?? null;
}
