import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing page. Supports both the PKCE `code` flow (default email
// template) and the `token_hash` flow (custom template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Only allow same-site relative paths, so the link can't redirect elsewhere.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Missing code") };

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=link", origin));
  }

  // The guest list in localStorage is imported client-side by <ImportLocalList>
  // (components/movies/import-local-list.tsx) on the next page load.
  return NextResponse.redirect(new URL(next, origin));
}
