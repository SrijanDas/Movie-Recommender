// Drizzle schema — the source of truth for every app table.
//
// Conventions (see docs/database.md):
// - Reference users with `uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" })`,
//   importing `authUsers` from "drizzle-orm/supabase". Never redefine the `auth` schema.
// - Call `.enableRLS()` on every table. With no policies, that blocks the public
//   Data API; Drizzle connects as `postgres` and is unaffected.

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { SIGNALS } from "../recommend/types"; // relative: drizzle-kit does not resolve "@/"
import { LIST_SOURCES } from "../lists/rules";

export const movieSignal = pgEnum("movie_signal", SIGNALS);
export const listSource = pgEnum("list_source", LIST_SOURCES);

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
  // "Seen it" answers (e.g. "quit") whose lists the user keeps off their
  // public profile.
  hiddenSeen: text("hidden_seen").array().notNull().default([]),
}).enableRLS();

// Named lists a user shares at /@handle/lists/<slug>, started from their
// watchlist or My films. See docs/lists.md.
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Set when the list is made and never changed, so renaming a list keeps
    // its shared link working. Unique per user.
    slug: text("slug").notNull(),
    // Where the list started. Null for a list made from scratch.
    source: listSource("source"),
    // My films only: the filter it started from ("all", "favorite" or a
    // "Seen it" answer).
    sourceFilter: text("source_filter"),
    // Keep in sync with the source: films that join it join the end of the
    // list, films that leave it leave the list. Otherwise the list is a copy.
    synced: boolean("synced").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("lists_user_slug").on(t.userId, t.slug)],
).enableRLS();

// The films in a list, in order. In a synced list a row also records the
// owner's edits: `hidden` for a source film they took out, `added` for a film
// they put in that isn't in the source (it stays when the source changes).
export const listItems = pgTable(
  "list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    position: smallint("position").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    added: boolean("added").notNull().default(false),
    // Display snapshot so lists render without a TMDB round-trip.
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    year: smallint("year"),
  },
  (t) => [primaryKey({ columns: [t.listId, t.tmdbId] })],
).enableRLS();
