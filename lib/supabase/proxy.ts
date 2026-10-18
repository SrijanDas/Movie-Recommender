import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session and writes the new cookies to both the
// request (for Server Components) and the response (for the browser).
// Returns the response to send and the verified user id (null if signed out).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Cache headers that stop CDNs from serving one user's session to another.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims(): getClaims()
  // triggers the token refresh. Never use getSession() for this in server code.
  const { data } = await supabase.auth.getClaims();

  // Send supabaseResponse as-is. To send a different response, build it with
  // redirectWithSession so its cookies and cache headers come along.
  return { response: supabaseResponse, userId: data?.claims.sub ?? null };
}

// A redirect that keeps the refreshed session cookies and cache headers.
export function redirectWithSession(session: NextResponse, url: URL) {
  const response = NextResponse.redirect(url);
  session.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((key) => {
    const value = session.headers.get(key);
    if (value) response.headers.set(key, value);
  });
  return response;
}
