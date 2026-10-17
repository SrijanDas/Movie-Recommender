import "server-only";
import { createClient } from "@/lib/supabase/server";

// The verified Supabase user id (JWT `sub`), or null when signed out.
// Use this to scope Drizzle queries to the current user.
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return data.claims.sub;
}
