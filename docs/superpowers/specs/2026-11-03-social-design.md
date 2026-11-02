# Social: find people, follow, like lists, send films

Date: 2026-11-03. Built autonomously; the two product calls below were confirmed with the user, the rest are the builder's calls.

## Intent

Next Movie is personal by design, but taste spreads between people. This adds the smallest social layer that makes the app worth opening for a friend's sake: find someone, follow them, like their lists, and send them a film (or several, or one of your lists) with a note. Nothing here changes recommendations.

## Goals

- Find anyone by name or username from Search.
- Follow people; see followers/following counts on every profile.
- Like a shared list (one tap, count shown to everyone).
- Send a film, a few films, or a list to someone with a short note. Received tips show at the top of the Watchlist and one tap saves the films.

## Non-goals / anti-goals

- No feed, no comments, no DMs, no notifications outside the tab badge.
- Follows don't change recommendations or what's public: profiles are already public.
- No approval flow for follows. Tips are not "edits": sending is one explicit tap, saving a film is one tap.

## Decisions (confirmed)

- **Inbox home:** the Watchlist page, as a "From friends" shelf above saved films, plus an unread badge on the Watchlist tab.
- **Who can send:** any member to any profile. The sender is always shown, so an unwanted tip is one Dismiss away.

## Builder's calls

- Data: `follows`, `list_likes`, `tips` (+ `tip_films`). A tip is either a list (`list_id`) or 1–20 films; a note up to 140 chars. Dismissing hides it for the recipient; the sender keeps nothing.
- People search: `/search/people`, Films | People toggle on both search pages. Until you type it lists the people you follow.
- Followers / following pages: `/@handle/followers` and `/@handle/following`, public like the profile.
- Entry points to send: the film page ("Send to a friend"), a shared list page, and another member's profile ("Recommend": pick films from your own list or any film, or one of your lists).
