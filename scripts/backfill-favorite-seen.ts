// TEMPORARY one-off backfill. Delete once it has run against production.
//
// Favourites now also list under "Seen it" with an answer stored in
// user_movies.seen_signal (migration 0007). Favourites saved before that have
// none; give them "peak" (DEFAULT_SEEN_ANSWER). Safe to re-run: it only touches
// favourites that still have no answer.
//
//   bun scripts/backfill-favorite-seen.ts            # dry run: count only
//   bun scripts/backfill-favorite-seen.ts --apply    # write
//
// Bun loads DATABASE_URL from .env.local. Run migration 0007 first.

import postgres from "postgres";
import { DEFAULT_SEEN_ANSWER } from "../lib/recommend/types";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.local)");
const apply = process.argv.includes("--apply");

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM user_movies
    WHERE signal = 'favorite' AND seen_signal IS NULL`;
  console.log(`${count} favourite(s) have no "Seen it" answer.`);

  if (apply && count > 0) {
    const updated = await sql`
      UPDATE user_movies SET seen_signal = ${DEFAULT_SEEN_ANSWER}::movie_signal
      WHERE signal = 'favorite' AND seen_signal IS NULL`;
    console.log(`Set ${updated.count} to "${DEFAULT_SEEN_ANSWER}".`);
  } else if (!apply) {
    console.log("Dry run. Re-run with --apply to write.");
  }
} finally {
  await sql.end();
}
