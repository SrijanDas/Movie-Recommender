# Profiles, usernames & sharing

← Back to [CLAUDE.md](../CLAUDE.md)

Everyone has a public profile at `/@handle`: picture, name, bio, a few lines about their taste, and their ranked favourites. It's the link people put in their bio.

## Files

| Path | Purpose |
| --- | --- |
| `lib/profile/rules.ts` | Handle rules (3–20 chars, `a-z 0-9 _ .`, no leading/trailing/double dots, reserved words), `handleCandidates(name)`, `MAX_BIO`, `profilePath()`. Pure. |
| `lib/profile/avatar.ts` | The `profiles.avatar` string format (`upload:` / `poster:` / `icon:` / null), `avatarImageUrl()`, the icon list. Pure. |
| `lib/profile/store.ts` | Drizzle queries: `getProfile`, `getProfileByHandle` (public), `isHandleTaken`, `suggestHandle`, `createProfile` (sign-up), `updateProfile`. |
| `lib/profile/taste.ts` | `getTaste(movies)`: ranked favourites, films seen, Peak count, directors (≥2 loved films) and top genres, #1's backdrop. |
| `app/profile/actions.ts` | `checkHandle` (live availability, used signed out on /sign-up), `suggestHandleFor`, `saveProfile` (editor, incl. photo upload). |
| `app/u/[handle]/` | Public page, its not-found state, and `opengraph-image.tsx` (the link-preview card). |
| `components/profile/` | `HandleField` + `useHandleCheck`, `ProfileAvatar`, `AvatarPicker`, `ProfileEditor`, `ShareProfileButton`/`ProfileLink`, `PublicProfile`. |

## Rules

- **Handles are unique and lowercase** (`profiles.handle` has a unique constraint). Always `normalizeHandle()` then `handleProblem()` before querying. The client checks as you type (`useHandleCheck`), but the server re-checks on save and catches the unique violation (`isHandleConflict`) for races.
- **Sign-up reserves the handle** by inserting the `profiles` row right after `supabase.auth.signUp`, with `onboarded_at: null` (it still has a `defaultNow()` so older inserts stay onboarded). `isOnboarded()` checks `onboarded_at`, not row existence.
- **Routing:** `next.config.ts` rewrites `/@:handle` → `/u/:handle`. `proxy.ts` lets signed-out visitors reach `/@…` and `/u/…`. Link to profiles with `profilePath(handle)`.
- **Public data only:** the public page shows `display_name`, never `user_metadata` or email. `saveProfile` also mirrors the name into `user_metadata.full_name` for the header.

## Avatars & Storage

This is the one place Supabase is used beyond auth. Photos go to the public **`files`** bucket under `avatars/<user id>/<uuid>.jpg`:

- The browser center-crops to 512px and re-encodes as JPEG (`AvatarPicker`), so uploads are small and render in the share image (satori can't read WebP reliably).
- `saveProfile` uploads with the **user's own session** (`createClient()` from `lib/supabase/server.ts`). Policies in `drizzle/0010_avatar_storage_policies.sql` let `authenticated` users read/insert/delete only inside their own `avatars/<uid>/` folder; reads of the public URL need no policy.
- Every upload gets a new file name (no cache busting needed); the previous upload is removed after the profile saves.
- Preset alternatives need no upload: `poster:` uses a favourite's TMDB poster, `icon:` one of `AVATAR_ICONS` (drawn by `components/profile/avatar-icons.ts`; the share image uses the vanilla `lucide` package's icon nodes because lucide-react components can't render in satori).

## Share image

`app/u/[handle]/opengraph-image.tsx` renders 1200×630: avatar, name, @handle, brand, and the top three posters fanned out. Satori rules: any `div` with more than one child needs `display: flex` (so write `` {`@${handle}`} ``, not `@{handle}`), and no React hooks inside the tree. Set `NEXT_PUBLIC_SITE_URL` in production so `metadataBase` makes the image URL absolute.
