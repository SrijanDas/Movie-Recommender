import type { NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

// Signed-out visitors may only see these; everything else needs an account.
const PUBLIC = new Set(["/", "/sign-in", "/sign-up", "/offline"]);
// Signed-in users skip the landing page, sign-in and sign-up.
const SIGNED_OUT_ONLY = new Set(["/", "/sign-in", "/sign-up"]);

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && !PUBLIC.has(pathname) && !pathname.startsWith("/auth/")) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithSession(response, url);
  }
  if (userId && SIGNED_OUT_ONLY.has(pathname)) {
    // The app layout sends users who haven't onboarded yet to /onboarding.
    return redirectWithSession(response, new URL("/recommendations", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimization and the PWA files.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
