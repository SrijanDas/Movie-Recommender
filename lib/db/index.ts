import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
};

const url = process.env.DATABASE_URL;
// Without a URL, postgres-js silently falls back to localhost as $USER.
if (!url) throw new Error("DATABASE_URL is not set (see .env.local)");

// Reuse one connection pool across dev hot reloads.
// `prepare: false` is required by Supabase's transaction pooler (port 6543).
const client = globalForDb.client ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle({ client, schema });
