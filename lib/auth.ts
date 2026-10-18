import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

// The verified Supabase user (JWT `sub` and email), or null when signed out.
// Cached per request, so layouts and pages can both ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

// The verified user id, or null. Use this to scope Drizzle queries.
export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

// The verified user id; signed-out visitors go to /sign-in. proxy.ts already
// redirects them, so this is the backstop for server code.
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}

// Only same-site relative paths, so a `next` param can't redirect elsewhere.
export function safeNext(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}
