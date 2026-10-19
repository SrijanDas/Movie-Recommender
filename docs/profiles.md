# Profiles, usernames & sharing

← Back to [CLAUDE.md](../CLAUDE.md)

Everyone has a public profile at `/@handle`: picture, name, bio, a few lines about their taste, their ranked favourites, and everything else they've seen, shelved by answer (Peak first, Left midway last). It's the link people put in their bio. When the owner views their own page they get edit controls (Share, Edit profile, Reorder favourites, a ⋯ menu per seen film to change its answer or remove it). The Profile tab (`/account`) renders the same component with `variant="app"`: only the header (picture, name, bio, taste line, link, Share/Edit), then the account settings, with no films.

The owner picks which Seen it lists are public from a switch on each shelf heading of their own `/@handle` page (`components/profile/seen-shelf.tsx`, saved at once by `setSeenShown`); hidden shelves stay visible to the owner, dimmed. Hidden answers are stored in `profiles.hidden_seen` (a text array, migration 0011) and are left out of `/@handle` for everyone; hiding Peak also drops the "called Peak" count.

## Files

| Path | Purpose |
| --- | --- |
| `lib/profile/rules.ts` | Handle rules (3–20 chars, `a-z 0-9 _ .`, no leading/trailing/double dots, reserved words), `handleCandidates(name)`, `MAX_BIO`, `profilePath()`. Pure. |
| `lib/profile/avatar.ts` | The `profiles.avatar` string format (`upload:` / `gen:` / null), `avatarImageUrl()`, `generatedAvatarUrl()`, `randomSeed()`. Pure. |
| `lib/profile/store.ts` | Drizzle queries: `getProfile`, `getProfileByHandle` (public), `isHandleTaken`, `suggestHandle`, `createProfile` (sign-up), `updateProfile`. |
| `lib/profile/taste.ts` | `getTaste(movies)`: ranked favourites, films seen, Peak count, directors (≥2 loved films), top genres, #1's backdrop, and the other seen films (newest first). |
| `app/profile/actions.ts` | `checkHandle` (live availability, used signed out on /sign-up), `suggestHandleFor`, `saveProfile` (editor, incl. photo upload). |
| `app/u/[handle]/` | Public page, its not-found state, and `opengraph-image.tsx` (the link-preview card). |
| `components/profile/` | `HandleField` + `useHandleCheck`, `ProfileAvatar`, `AvatarPicker`, `ProfileEditor`, `ShareProfileButton`/`ProfileLink`, `PublicProfile` (page + app variants). The public page ends with the one-line `ProfileFooter` (© + Credits); the full `SiteFooter` is the landing page's. |

## Rules

- **Handles are unique and lowercase** (`profiles.handle` has a unique constraint). Always `normalizeHandle()` then `handleProblem()` before querying. The client checks as you type (`useHandleCheck`), but the server re-checks on save and catches the unique violation (`isHandleConflict`) for races.
- **Sign-up reserves the handle** by inserting the `profiles` row right after `supabase.auth.signUp`, with `onboarded_at: null` (it still has a `defaultNow()` so older inserts stay onboarded). `isOnboarded()` checks `onboarded_at`, not row existence.
- **Routing:** `next.config.ts` rewrites `/@:handle` → `/u/:handle`. `proxy.ts` lets signed-out visitors reach `/@…`, `/u/…` and `/movie/…`, so every film on a profile links to its page for everyone. Both public pages end with `JoinBar` (`components/site/join-bar.tsx`) for anyone who isn't signed in (and, on profiles, members who aren't the owner). Link to profiles with `profilePath(handle)`.
- **Public data only:** the public page shows `display_name`, never `user_metadata` or email. `saveProfile` also mirrors the name into `user_metadata.full_name` for the header.

## Avatars & Storage

This is the one place Supabase is used beyond auth. Photos go to the public **`files`** bucket under `avatars/<user id>/<uuid>.jpg`:

- The browser center-crops to 512px and re-encodes as JPEG (`AvatarPicker`), so uploads are small and render in the share image (satori can't read WebP reliably).
- `saveProfile` uploads with the **user's own session** (`createClient()` from `lib/supabase/server.ts`). Policies in `drizzle/0010_avatar_storage_policies.sql` let `authenticated` users read/insert/delete only inside their own `avatars/<uid>/` folder; reads of the public URL need no policy.
- Every upload gets a new file name (no cache busting needed); the previous upload is removed after the profile saves.
- The alternative needs no upload: `gen:<seed>` is a generated avatar from [DiceBear](https://www.dicebear.com/)'s **Lorelei** style (CC0, so no attribution needed), served from `api.dicebear.com` as SVG in the app and PNG in the share image. The picker shows 15 random seeds ("More avatars" adds 10 at a time, up to 60, in a scrolling grid) and a Random button that sets a fresh one straight away.

## Share image

`app/u/[handle]/opengraph-image.tsx` renders 1200×630: avatar, name, @handle, brand, and the top three posters fanned out. Satori rules: any `div` with more than one child needs `display: flex` (so write `` {`@${handle}`} ``, not `@{handle}`), and no React hooks inside the tree. Set `NEXT_PUBLIC_SITE_URL` in production so `metadataBase` makes the image URL absolute.
