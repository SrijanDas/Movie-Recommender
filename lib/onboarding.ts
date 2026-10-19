import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// Onboarding is one step: pick films you love. It's shown until the user
// finishes it once, then never again (favourites are edited on My films).
// Sign-up creates the profiles row (to reserve the handle) with
// onboarded_at null; finishing onboarding sets it.

export async function isOnboarded(userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.userId, userId), isNotNull(profiles.onboardedAt)))
    .limit(1);
  return rows.length > 0;
}

export async function markOnboarded(userId: string) {
  await db.insert(profiles).values({ userId }).onConflictDoNothing();
  await db
    .update(profiles)
    .set({ onboardedAt: new Date() })
    .where(and(eq(profiles.userId, userId), isNull(profiles.onboardedAt)));
}

// Where a signed-in user starts: the picker until onboarded, then the app.
export async function homeFor(userId: string): Promise<string> {
  return (await isOnboarded(userId)) ? "/recommendations" : "/onboarding";
}
