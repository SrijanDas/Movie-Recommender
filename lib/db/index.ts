import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
};

// Reuse one connection pool across dev hot reloads.
// `prepare: false` is required by Supabase's transaction pooler (port 6543).
const client =
  globalForDb.client ??
  postgres(process.env.DATABASE_URL!, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle({ client, schema });
