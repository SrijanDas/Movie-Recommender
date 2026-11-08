// Drizzle schema — the source of truth for every app table.
//
// Conventions (see docs/database.md):
// - Reference users with `uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" })`,
//   importing `authUsers` from "drizzle-orm/supabase". Never redefine the `auth` schema.
// - Call `.enableRLS()` on every table. With no policies, that blocks the public
//   Data API; Drizzle connects as `postgres` and is unaffected.

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { SIGNALS } from "../recommend/types"; // relative: drizzle-kit does not resolve "@/"
import { LIST_SOURCES } from "../lists/rules";
import { MEMORY_KINDS, type MemoryFilm } from "../memories/types";

export const movieSignal = pgEnum("movie_signal", SIGNALS);
export const listSource = pgEnum("list_source", LIST_SOURCES);
export const memoryKind = pgEnum("memory_kind", MEMORY_KINDS);

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
    // Set when the user taps a watch option on the film page. Meaningful only
    // on a watchlist row: that film is "Watching", and the app asks how it
    // went next time it opens (see lib/watch/check-in.ts). Any other write
    // of the row (a "Seen it" answer, a fresh save) clears all three.
    startedAt: timestamp("started_at", { withTimezone: true }),
    // The option tapped, e.g. "Stremio" or "Netflix".
    startedVia: text("started_via"),
    // When the user last said "Still watching" to the check-in, which waits
    // a day before asking again.
    nudgedAt: timestamp("nudged_at", { withTimezone: true }),
    // When the user watched it: set when a watchlist film gets a "Seen it"
    // answer or becomes a favourite (to started_at if they started it from
    // the film page, else the moment they answered). Kept through later
    // answers; cleared if the film leaves My films. Null for films logged as
    // seen without passing through the watchlist, since when they were
    // watched is unknown. Feeds memories (lib/memories).
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    // The watch option they started it from, if any (started_via, kept).
    watchedVia: text("watched_via"),
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
  (t) => [
    primaryKey({ columns: [t.userId, t.tmdbId] }),
    index("user_movies_watched_at_idx").on(t.watchedAt),
  ],
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

// Who follows whom. One row per (follower, followed); following is public
// and needs no approval. See docs/social.md.
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follows_following_idx").on(t.followingId)],
).enableRLS();

// A member's like on a shared list. One row per (list, user).
export const listLikes = pgTable(
  "list_likes",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.userId] })],
).enableRLS();

// A film (or a few), or a shared list, one member sent another with a note.
// A list tip has `list_id`; a film tip has rows in tip_films. The recipient
// sees it on their watchlist until they dismiss it.
export const tips = pgTable(
  "tips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // The list sent, when it's a list; goes with the list if it's deleted.
    listId: uuid("list_id").references(() => lists.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // When the recipient first opened their watchlist with it there.
    seenAt: timestamp("seen_at", { withTimezone: true }),
    // Set when the recipient dismisses it; dismissed tips never show again.
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => [index("tips_to_user_idx").on(t.toUserId)],
).enableRLS();

// The films in a film tip, in the order they were picked.
export const tipFilms = pgTable(
  "tip_films",
  {
    tipId: uuid("tip_id")
      .notNull()
      .references(() => tips.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    position: smallint("position").notNull(),
    // Display snapshot so tips render without a TMDB round-trip.
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    year: smallint("year"),
  },
  (t) => [primaryKey({ columns: [t.tipId, t.tmdbId] })],
).enableRLS();

// Memories waiting to reach the user: "on this day" a film was watched in an
// earlier year, and the recap of a month or year just ended. Queued daily by
// /api/cron/memories (lib/memories/queue.ts); a delivery channel (push,
// email, in-app) sends the unsent ones and stamps sent_at. One row per
// (user, kind, period), so re-running a day never queues twice.
export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    kind: memoryKind("kind").notNull(),
    // The period it covers: "2026-11-08" (on this day), "2026-10" (month
    // recap) or "2025" (year recap).
    period: text("period").notNull(),
    // The films, as they were when queued.
    films: jsonb("films").$type<MemoryFilm[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("memories_user_kind_period_idx").on(t.userId, t.kind, t.period),
    index("memories_unsent_idx").on(t.createdAt).where(sql`${t.sentAt} is null`),
  ],
).enableRLS();
