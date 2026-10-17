// Drizzle schema — the source of truth for every app table.
//
// Conventions (see docs/database.md):
// - Reference users with `uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" })`,
//   importing `authUsers` from "drizzle-orm/supabase". Never redefine the `auth` schema.
// - Call `.enableRLS()` on every table. With no policies, that blocks the public
//   Data API; Drizzle connects as `postgres` and is unaffected.

export {};
