import "server-only";
import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

// Supabase is used for auth only. Query app data through Drizzle (`@/lib/db`).
// Create a new client per request — never share one across requests.
export async function createClient() {
  const cookieStore = await cookies();
  // The auth client checks session expiry against Date.now() as soon as it is
  // constructed; defer to request time so prerendering never reads the clock.
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't write cookies.
            // Safe to ignore: proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}
