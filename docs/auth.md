# Auth (Supabase)

← Back to [CLAUDE.md](../CLAUDE.md)

**Supabase is used for authentication only.** Never query app tables with `supabase.from(...)` or call Supabase Storage/Realtime/RPC for app data — all data access goes through Drizzle ([database.md](database.md)).

## Files

| File | Use |
| --- | --- |
| `lib/supabase/server.ts` | `createClient()` for Server Components, Server Actions, Route Handlers. One per request. |
| `lib/supabase/client.ts` | `createClient()` for Client Components (sign-in forms, OAuth buttons, sign-out). |
| `lib/supabase/proxy.ts` + `proxy.ts` | Refreshes the session cookie on every non-static request. |
| `lib/auth.ts` | `getCurrentUserId()` — verified user id (`claims.sub`) or `null`. |
| `app/sign-in/page.tsx` + `app/auth/actions.ts` | Email magic link (`signInWithEmail`), password sign-in / sign-up (`signInWithPassword`, `intent=sign-up` creates the account), and `signOut`. |
| `app/auth/confirm/route.ts` | Magic-link landing: handles `code` (PKCE) and `token_hash` links, then merges the anonymous cookie list into the account. |

## Rules

- **Verify with `getClaims()`** (or `getUser()` when you need fresh user data). Never trust `getSession()` on the server — the cookie can be forged.
- **Authorize in server code.** Drizzle bypasses RLS, so every query touching user data must filter by `getCurrentUserId()`. Check ownership in Server Actions before mutating.
- **Never use `user_metadata` for authorization** — users can edit it. Use `app_metadata` or our own tables.
- `proxy.ts` must return the response built by `updateSession` (or copy its cookies and cache headers onto yours). Don't add a second session-refresh path; refresh tokens are single-use.
- Next.js 16 uses `proxy.ts` / `export function proxy` — not `middleware.ts`.
- Only the publishable key is used. Never put a secret/`service_role` key in a `NEXT_PUBLIC_` var.

## Setup

- Supabase dashboard → Authentication → URL Configuration: add `http://localhost:3000/auth/confirm` (and the production URL) to the redirect allow list.
- Authentication → Providers → Email: keep **Email** enabled for passwords. With **Confirm email** on, password sign-up emails a link to `/auth/confirm` before the first sign-in; with it off, sign-up signs in at once. Supabase enforces its own minimum password length; ours is 8, so keep the dashboard value ≤ 8.
- Users who signed up by magic link have no password. They get "Wrong email or password" and use an email link instead.
- Optional `NEXT_PUBLIC_SITE_URL` sets the magic-link origin; otherwise the request's `Origin` header is used.

Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
