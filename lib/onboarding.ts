import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// Onboarding is one step: pick films you love. It's shown until the user
// finishes it once, then never again (favourites are edited on My films).

export async function isOnboarded(userId: string): Promise<boolean> {
  const rows = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function markOnboarded(userId: string) {
  await db.insert(profiles).values({ userId }).onConflictDoNothing();
}

// Where a signed-in user starts: the picker until onboarded, then the app.
export async function homeFor(userId: string): Promise<string> {
  return (await isOnboarded(userId)) ? "/recommendations" : "/onboarding";
}
