// Drizzle schema — the source of truth for every app table.
//
// Conventions (see docs/database.md):
// - Reference users with `uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" })`,
//   importing `authUsers` from "drizzle-orm/supabase". Never redefine the `auth` schema.
// - Call `.enableRLS()` on every table. With no policies, that blocks the public
//   Data API; Drizzle connects as `postgres` and is unaffected.

import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { SIGNALS } from "../recommend/types"; // relative: drizzle-kit does not resolve "@/"

export const movieSignal = pgEnum("movie_signal", SIGNALS);

// Every movie a user has an opinion on: their favourites, other likes, and
// feedback on recommendations. One row per (user, movie).
export const userMovies = pgTable(
  "user_movies",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    signal: movieSignal("signal").notNull(),
    // Position among the user's favourites (0 = the film they love most).
    // Null for every other signal, and for favourites saved before ranking
    // existed, which then sort by created_at.
    rank: smallint("rank"),
    // Favourites only: the "Seen it" answer it also carries (a favourite was
    // seen, so it lists under Seen it too). Null for every other signal.
    seenSignal: movieSignal("seen_signal"),
    // Display snapshot so lists render without a TMDB round-trip.
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    year: smallint("year"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tmdbId] })],
).enableRLS();

// One row per user, created at sign-up (which reserves the handle) or, for
// older accounts, at onboarding. The public profile lives at /@handle.
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  // When the user finished onboarding (picked their first favourites). The
  // picker is shown while this is null, and never again after. Sign-up
  // inserts null explicitly; the default keeps older inserts onboarded.
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }).defaultNow(),
  // Lowercase, unique; see lib/profile/rules.ts. Null for accounts made
  // before handles existed, until they claim one.
  handle: text("handle").unique(),
  // Public display name. Mirrors user_metadata.full_name, which only the
  // signed-in user can read.
  displayName: text("display_name"),
  bio: text("bio"),
  // "upload:<storage path>", "poster:<TMDB poster path>" or "icon:<preset>";
  // null shows initials. See lib/profile/avatar.ts.
  avatar: text("avatar"),
}).enableRLS();
