import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { homeFor } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing page. Supports both the PKCE `code` flow (default email
// template) and the `token_hash` flow (custom template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { data: { user: null }, error: new Error("Missing code") };

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in?error=link", origin));
  }

  // First sign-in goes to onboarding, whatever page the link was sent from.
  const home = await homeFor(data.user.id);
  return NextResponse.redirect(new URL(home === "/onboarding" ? home : (next ?? home), origin));
}
