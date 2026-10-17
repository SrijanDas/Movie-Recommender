import { createBrowserClient } from "@supabase/ssr";

// Browser client for auth flows in Client Components (sign in/out, OAuth).
// Do not use it for data access — app data goes through Drizzle on the server.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
