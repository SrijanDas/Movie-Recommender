# Product

What we're building and why. For how it's built, see [CLAUDE.md](CLAUDE.md) and [docs/](docs/). For how it looks, see [DESIGN.md](DESIGN.md).

## One-liner

Tap a few films you love and we'll tell you what to watch next, and why.

## Problem

"Top 10" lists and trending charts are the same for everyone. Streaming-service recommendations mix your taste with whatever the service wants to promote, and they never explain themselves. People who know exactly which films they love still spend their evenings scrolling.

## Who it's for

Casual to avid movie watchers who know the films they love but struggle to pick the next one. They're usually on their phone, and they don't want to rate hundreds of titles before getting something useful.

## Core flows

1. **Land and sign up.** A landing page explains the app; everything else needs an account. Sign-up asks one thing per screen: name, then a username (prefilled with a free one made from the name, checked as you type), then email, then password. Sign-in is email + password, with an email link as a fallback. There is no anonymous mode.
2. **Pick films you love (onboarding).** The first and only onboarding step: tap favourites from a ready-made grid of well-known films, or search for any film. At least 3 (up to 10) unlock recommendations; My films can add more favourites later, up to 10 in all. Shown once; afterwards favourites are edited on My films.
3. **Get recommendations.** See a grid of films, each with the reasons it was picked ("Directed by Denis Villeneuve", "Stars Amy Adams"). Tap one for its details: overview, director, cast, trailer, and where to watch it in your country (stream, free, rent or buy). A star on the film page makes it a favourite (or takes it out of them).
4. **Search.** Search (the icon in the header on phones) opens its own page: popular films until you type, then results as a poster grid. Tap one to open its page.
5. **Give feedback or save for later.** Under each recommendation: "Seen it" (then say how it was: "Left midway", "Won’t rewatch", "Okay, but won’t rewatch", "Kinda liked it", "Good movie" or "Peak"), and a bookmark icon to add it to the watchlist. A ⋯ menu on the poster's corner offers "Not interested" (fewer like it) and "Might watch someday" (hides it, taste unchanged).
6. **Watchlist.** Films saved for later, newest first. Say how one was once you've watched it, and it moves to My films. Share turns it into a named list (see 10). A "Might watch someday" link under the heading opens those films on My films.
7. **Add more over time.** "My films" is one list of every film you've seen. A search bar at the top finds films in your own list only, and a filter menu beside it in the same row narrows the list to All (the default), "Might watch someday" (right after All and set apart, since those films weren't seen: say how one was, move it to the watchlist, or remove it), one "Seen it" answer (worst to best), or Favourites (after Peak); search works within the chosen filter. The filter and search are kept in the page address, so a refresh or a shared link keeps them. Under Favourites, an Add button opens the onboarding picker (popular films plus search), where you tap any number of films and add them all at once; a floating Edit button opens the ranking page. Tap a film to open its page. Favourites are ranked: Edit opens its own page where you drag them into order, move one to any position from its Move menu, or remove it, with a sticky Done button that saves the edit (nothing saves before it; Cancel discards). New favourites join the bottom, so the "added" toast offers "Rank them". Promote any film you've seen to a favourite with one tap; removing a seen film asks first.
8. **Install it.** The site is an installable PWA; the Profile page (the Profile tab on phones, the avatar in the header on larger screens) offers "Install Next Movie" (or iOS instructions).
9. **Show off your taste.** Everyone gets a public profile at `/@username`, made to share like a playlist link in a bio: their picture, name, a one-line bio, a few lines about their taste (films seen, how many they called Peak, directors they keep coming back to, top genres), their favourites ranked with #1 on the stage, and every other film they've seen, as a shelf of fanned poster cards, one per answer from Peak to Left midway, each opening its own page of those films. Anyone can open it without an account; visitors get one button to make their own. The link previews as a card with the top three posters. On your own page you also get Edit profile, Reorder favourites, and a ⋯ on each seen film to change how it was or remove it. The Profile tab shows who you are and your link with Share (the phone's share sheet, else copy) and Edit, then settings; the films live on your public page and My films. Edit changes the picture (upload a photo, or pick one of five generated avatars or a random one), name, username (saved only once it's checked free), bio, and which Seen it lists show on your page (all by default). Older accounts without a username are asked to pick one.
10. **Share a list.** A Share button on the Watchlist, and a Share icon beside the My films filter (starting from whatever the filter shows: All, one answer, or Favourites in rank order), open the list editor. Name the list, drag films into order (or use Move), take films out, and add any film from the same picker as onboarding. It asks "Update this list automatically?". **Yes, keep it up to date**: films you later save to the watchlist (or that join that filter) are added at the end, films that leave it are removed, and your own edits stay. **No, only when I edit it**: the list stays as it is now. You can switch later. "Save & share" opens the list's own page at `/@username/lists/name`, with its link, Share and Edit. Anyone can open it, and it previews as a card with the first three posters. Every list shows on your profile, and on the Profile tab, as a shelf of fanned poster cards ("Live" marks synced ones), with a "New list" button in the heading (start from the watchlist, My films, or empty) and a "New list" tile to start one from scratch. Renaming a list keeps its link. Deleting it asks first, because the link stops working.

## How recommendations are chosen

Each recommendation is a film close to the films you've rated, where closeness means sharing specific things with them: the same director counts most, then the lead actors, genre, tone (keywords like "time travel", "heist", "dystopia"), supporting actors and format (live action, animated, documentary). A trait that nearly every film has, like "Drama", counts for little; a rare one, like a director or an unusual keyword, counts for a lot. The film database's own "people who liked this also liked" lists count too, so a film other people reached from your favourite ranks higher.

| Attribute | Example |
| --- | --- |
| Director | Christopher Nolan |
| Lead actors | the two top-billed cast |
| Genre | Science Fiction, Drama |
| Tone | keywords like "time travel", "heist", "dystopia" |
| Supporting actors | the next six billed cast |
| Format | live action, animated, documentary, short |

Favourites count most, and their order matters: the favourite at the top of your list shapes recommendations the most, the one at the bottom the least. "Peak" adds strongly to your profile; other liked films and "Good movie" add to it; "Kinda liked it" adds half as much; "Okay, but won’t rewatch" neither adds nor subtracts. "Not interested" counts against films like that one; "Won’t rewatch" counts slightly against them, and "Left midway" counts against them strongly. Any answer, "Might watch someday", and adding it to the watchlist hide the film from recommendations; the watchlist and "Might watch someday" don't change your taste profile. Every change takes effect the next time you load your recommendations, so they improve as you use the app.

Each card says which of your films it was picked for ("Because you like Spirited Away") and the strongest things they share ("Directed by Hayao Miyazaki", "Prison escape"). A film is named only when it really is close to the pick, so the same two favourites don't explain everything. Well-rated, widely seen films get a small edge. Each batch of 20 is varied: no run of films by one director, one film per franchise, and a genre mix that follows yours, so a taste that is two-thirds animation and one-third horror gets both.

## Principles

- **Always explain.** Every recommendation shows why it was picked.
- **Never repeat.** A film you've rated, liked or marked seen never shows up as a recommendation.
- **Account first, value fast.** Signing up is one email; onboarding is one screen of taps, then recommendations.
- **Mobile app first.** Every screen is designed as a phone app first: bottom tab bar (Watch, Watchlist, My films, Profile) with Search in the header, thumb-reach actions, installable to the home screen. Tapping beats typing, and there's one obvious next step.
- **Cinematic and calm.** A dark interface where posters do the talking (see [DESIGN.md](DESIGN.md)).

## Scope

**MVP**
- Landing page, and email sign-in (required)
- Onboarding favourites picker: a tappable grid of well-known films plus search, minimum 3
- Recommendations with reasons, and search
- "Seen it" feedback: left midway / won’t rewatch / okay, but won’t rewatch / kinda liked it / good movie / peak
- Watchlist
- A "My films" page to edit the list: ranked favourites, and everything you've seen
- Installable PWA
- Public profile at /@username with picture, bio, taste and ranked favourites, and a share button
- Shared lists from the watchlist or My films, synced or copied, listed on the profile

**Later**
- Per-user attribute weights (for example, learning that one user follows directors more than actors)
- AI-written "why you'll like it" blurbs

## Success signals

- Share of seen recommendations rated "Peak", "Good movie" or "Kinda liked it" rather than "Won’t rewatch" or "Left midway"
- Share of users who come back to add movies or give feedback
- Share of landing visitors who sign up and finish onboarding

## Constraints

- Movie data comes from [TMDB](https://www.themoviedb.org/). Its free API is for non-commercial use and requires visible attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB"). All attribution lives on one Credits page, linked from Account and the footer; no other screen names the services we use. Commercial use needs a TMDB licence.
