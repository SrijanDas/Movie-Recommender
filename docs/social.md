# Social: people, follows, list likes, tips

← Back to [CLAUDE.md](../CLAUDE.md)

The smallest social layer: find people, follow them, like their lists, and send them a film (or a few, or one of your lists) with a note. Nothing here changes recommendations or what's public; profiles and lists were already public. Design record: [superpowers/specs/2026-11-03-social-design.md](superpowers/specs/2026-11-03-social-design.md).

## What it does

- **Find people:** Search has a Films | People toggle (`SearchTabs`). `/search/people` finds anyone by name or username (`profiles.handle` / `display_name`, `ilike`, usernames starting with the query first) and lists the people you follow until you type. The query lives in `?q=`.
- **Follow:** one tap, no approval (`FollowButton`, optimistic). Every profile shows "N followers · N following" (`FollowStats`), each opening `/@handle/followers` or `/@handle/following` (public, like the profile; members get Follow buttons on the rows).
- **Like a list:** a heart with the count on every shared list page (`LikeListButton`). Members toggle it; visitors see the count and are sent to sign in. The profile's Lists shelf shows a list's likes when it has any.
- **Send a film or a list (a "tip"):** from a film page ("Send to a friend"), a shared list page, or someone's profile ("Recommend": pick films from your own list or any film, up to 20, or one of your lists), with a note up to 140 characters. The recipient sees it in a **From friends** shelf at the top of their Watchlist (`TipsShelf`), and the Watchlist tab carries an unread count until they open the page. **Save to watchlist** saves the tip's films it doesn't already have and clears the tip; **Open list** opens the list; the × dismisses. Films already in the recipient's list show dimmed, and a tip whose films are all there says so instead of offering Save.

Anyone with an account can send to anyone with a username (confirmed product call). The sender is always shown, so an unwanted tip is one Dismiss away.

## Data (`lib/db/schema.ts`, migration `0014_social`)

- **`follows`** (`follower_id`, `following_id`, `created_at`), primary key on the pair, index on `following_id`.
- **`list_likes`** (`list_id` → cascades with the list, `user_id`).
- **`tips`**: `from_user_id`, `to_user_id`, `list_id` (null for a film tip; cascades with the list), `note`, `seen_at` (set when the recipient opens their watchlist), `dismissed_at` (set on Dismiss or after Save; dismissed tips never show again).
- **`tip_films`**: one row per (tip, film), `position`, plus a title/poster/year snapshot.

A tip is either a list or 1–20 films, never both; `sendTip` enforces it. Senders keep nothing: there's no "sent" history.

## Files

| Path | Purpose |
| --- | --- |
| `lib/social/rules.ts` | Limits (`MAX_TIP_NOTE`, `MAX_TIP_FILMS`, `MAX_PEOPLE_RESULTS`, `MIN_PEOPLE_QUERY`), `followersPath`/`followingPath`, the `Person` shape, `timeAgo`. Pure. |
| `lib/social/store.ts` | Drizzle: `searchPeople`, follow/unfollow, `getFollowStats`, `isFollowing`, `getFollowingIds`, `getFollowers`/`getFollowing`, list likes (`likeList`, `unlikeList`, `getListLikes`, `getListLikeCounts`), tips (`createTip`, `getInbox`, `countUnseenTips`, `markTipsSeen`, `dismissTip`). `getInbox` resolves list tips the way their page does (synced lists follow the owner's films). |
| `app/social/actions.ts` | Server Actions: `searchPeopleAction` (marks who you follow, leaves you out), `followingAction`, `setFollowing`, `setListLiked`, `sendTip`, `dismissTip`, `markInboxSeen`. |
| `app/(app)/search/people/` | The People tab of Search. |
| `app/u/[handle]/followers/`, `following/` | The people lists, rewritten from `/@handle/followers` and `/@handle/following` (`next.config.ts`). |
| `components/social/` | `SearchTabs`, `PeopleSearch` (+ `PeopleSkeleton`), `PersonRow` (+ `PEOPLE_LIST`), `FollowButton`, `FollowStats`, `LikeListButton`, `SendToFriend` (+ `NoteField`), `RecommendTo`, `PeoplePicker`, `TipsShelf`, `PeoplePage`, and the `Sheet*` frame shared by the send sheets (full screen on phones). |

## Rules

- **One-tap actions are the action**, not edits (CLAUDE.md rule 12): Follow, Like, Save and Dismiss write at once with optimistic UI and no Save bar. Sending is a sheet with an explicit Send button.
- **Follows and likes are public counts**; no one is notified. The only notification is the Watchlist tab badge, from `countUnseenTips` in the app header's `getMe()`.
- **Pickers load lazily:** `PeoplePicker` fetches the follow list when the sheet opens (`followingAction`), so film and list pages don't query it up front. `RecommendTo` gets its starters (your favourites, then your seen films, newest first, up to 60) and your lists from the profile page, which only loads them for a member viewing someone else.
- `PageBackdrop` collapses to just the bar when a page has no stills (the people lists).
