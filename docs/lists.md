# Shared lists

← Back to [CLAUDE.md](../CLAUDE.md)

A user turns their watchlist, or whatever My films is showing (All, one "Seen it" answer, or Favourites), into a named list they can share at `/@handle/lists/<slug>`. Before sharing they name it, reorder it, take films out and add any film. Every list shows on their profile (and on the Profile tab), newest first.

## Sync or copy

The editor asks "Update this list automatically?" when sharing; the owner can switch later. Each option explains itself in terms of its source (`describeSource` in `components/lists/source-copy.ts`):

- **"Yes, keep it up to date"** (`lists.synced`): the list follows its source. Films that join the source join the **end** of the list (the same rule as new favourites). Films that leave it (say, a watchlist film you rate) leave the list. The owner's edits stick: the order they set, the films they took out, the films they added from outside the source.
- **"No, only when I edit it"** (a copy): the list shows exactly its saved items, whatever happens to the source.

A list made from scratch (`/lists/new` with no `from`, via the "New list" tile) has no source and is always a copy.

## Data (`lib/db/schema.ts`, migration `0012_shared_lists`)

- **`lists`**: `user_id`, `name` (≤ 60 chars), `slug` (unique per user), `source` (`watchlist` | `my_films`, or null), `source_filter` (My films only: `all`, `favorite` or an answer), `synced`.
- **`list_items`**: one row per (list, film): `position`, a title/poster/year snapshot, and two flags used only by synced lists. `hidden` marks a source film the owner took out. `added` marks a film the owner put in that isn't in the source, so it stays when the source changes.

**The slug is set when the list is created and never changes**, so renaming a list keeps every shared link working. A clash gets `-2`, `-3`…

## Resolution (`lib/lists/resolve.ts`, pure)

`resolveList(list, items, userMovies)` returns the films a list shows now:

- **Copy:** the items without `hidden`, by position.
- **Synced:**
  1. Walk the items by position. Skip `hidden` ones, and skip ones that aren't `added` and have left the source.
  2. Append source films with no item yet, in source order.

`sourceFilms` gives a source's films in the order its page shows them: the watchlist newest first (`watchlistOf`), My films through `filterMyFilms` (in `lib/movies/types.ts`, shared with the My films page; Favourites are ranked).

Nothing is stored when the source changes: lists resolve on every read. On save, `saveListAction` re-derives `added`/`hidden` against the current source, so the client only sends the shown ids in order plus the source films it took out.

## Files

| Path | Purpose |
| --- | --- |
| `lib/lists/rules.ts` | `LIST_SOURCES`, limits (`MAX_LIST_NAME`, `MAX_LIST_FILMS` = 200), `slugify`, `freeSlug`, `listPath`. Pure; imported by the schema (relative imports only). |
| `lib/lists/resolve.ts` | `sourceFilms`, `resolveList`. Pure. |
| `lib/lists/store.ts` | Drizzle: `getUserLists`, `getListBySlug`, `getList`, `saveList` (create or overwrite, items replaced in one transaction), `deleteList`. |
| `lib/lists/public.ts` | `loadSharedList(handle, slug)` for the page, metadata and share image; `getListCards` for the profile shelf. |
| `app/lists/actions.ts` | `saveListAction` (validates; snapshots come from the user's films, the saved list, or the movie database for new ids) and `deleteListAction`. |
| `app/(app)/lists/new/` | Editor for a new list: `?from=watchlist`, or `?from=my-films&filter=<filter>`. |
| `app/(app)/lists/[id]/edit/` | Editor for a saved list, plus Delete. |
| `app/u/[handle]/lists/[slug]/` | The public page (rewritten from `/@handle/lists/slug`), its not-found state and share image. |
| `components/lists/` | `ListEditor`, `PublicList`, `ListsShelf` (+ `LiveTag`), `NewListMenu`, `describeSource` (editor copy per source). |
| `components/movies/sortable-film-list.tsx` | The drag/Move/remove list shared with the favourites editor. |

## Entry points

- **Watchlist:** a Share button in the header.
- **My films:** a Share icon beside the filter; it starts from the current filter.
- **Profile:** a "New list" menu in the Lists heading (`NewListMenu`): from the watchlist, from My films (All), or empty. The "New list" tile at the end of the shelf also starts empty.

After the first save the editor goes to the list's page. There the owner gets the copyable link, Share (the share sheet, else copy) and Edit.
