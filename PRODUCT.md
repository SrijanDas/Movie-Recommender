# Product

What we're building and why. For how it's built, see [CLAUDE.md](CLAUDE.md) and [docs/](docs/). For how it looks, see [DESIGN.md](DESIGN.md).

## One-liner

Tap a few films you love and we'll tell you what to watch next, and why.

## Problem

"Top 10" lists and trending charts are the same for everyone. Streaming-service recommendations mix your taste with whatever the service wants to promote, and they never explain themselves. People who know exactly which films they love still spend their evenings scrolling.

## Who it's for

Casual to avid movie watchers who know the films they love but struggle to pick the next one. They're usually on their phone, and they don't want to rate hundreds of titles before getting something useful.

## Core flows

1. **Pick films you love.** Tap favourites from a ready-made grid of well-known films, or search for any film. At least 3 (up to 10) unlock recommendations. No account needed.
2. **Get recommendations.** See a grid of films, each with the reasons it was picked ("Directed by Denis Villeneuve", "Stars Amy Adams"). Tap one for its details: overview, director, cast and trailer.
3. **Give feedback.** Tap "Not interested" on a recommendation you don't want to watch (fewer like it), or tap "Seen it" on a recommendation you've watched, then say how it was: "Left midway", "Would not rewatch", "Kinda liked it" or "Loved it".
4. **Add more over time.** Add other films you like whenever they come to mind. "My films" has two tabs, Favourites and Seen it, each with a search box to add films. Favourites are ranked: drag them into order, and promote any film you've seen to a favourite with one tap.
5. **Sign in to save.** Anyone can try the app first. Signing in keeps your list and feedback across devices, and anything added before signing in comes with you.

## How recommendations are chosen

Each film is described by six attributes, which count toward a match in this order of importance:

| Attribute | Example |
| --- | --- |
| Director | Christopher Nolan |
| Lead actors | the two top-billed cast |
| Genre | Science Fiction, Drama |
| Tone | keywords like "time travel", "heist", "dystopia" |
| Supporting actors | the next six billed cast |
| Format | live action, animated, documentary, short |

Favourites count most, and their order matters: the favourite at the top of your list shapes recommendations the most, the one at the bottom the least. Other liked films and "Loved it" add to your profile; "Kinda liked it" adds half as much. "Not interested" counts against that film's director, cast and themes; "Would not rewatch" counts slightly against that film's director, cast and themes, and "Left midway" counts against them strongly. Any answer hides the film from recommendations. Every change takes effect the next time you load your recommendations, so they improve as you use the app.

## Principles

- **Always explain.** Every recommendation shows why it was picked.
- **Never repeat.** A film you've rated, liked or marked seen never shows up as a recommendation.
- **Value before sign-up.** Recommendations come before any account wall.
- **Mobile-first and simple.** Every screen is designed for a phone first. Tapping beats typing, and there's one obvious next step.
- **Cinematic and calm.** A dark interface where posters do the talking (see [DESIGN.md](DESIGN.md)).

## Scope

**MVP**
- Favourites picker: a tappable grid of well-known films plus search, minimum 3
- Recommendations with reasons
- "Seen it" feedback: left midway / would not rewatch / kinda liked it / loved it
- A "My films" page to edit the list: ranked favourites, and everything you've seen
- Anonymous use, plus email sign-in that keeps the anonymous list

**Later**
- Watchlist
- Where to stream each film
- Per-user attribute weights (for example, learning that one user follows directors more than actors)
- Sharing your favourites
- AI-written "why you'll like it" blurbs

## Success signals

- Share of seen recommendations rated "Loved it" or "Kinda liked it" rather than "Would not rewatch" or "Left midway"
- Share of users who come back to add movies or give feedback
- Share of anonymous users who sign in to save

## Constraints

- Movie data comes from [TMDB](https://www.themoviedb.org/). Its free API is for non-commercial use and requires visible attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB"). Commercial use needs a TMDB licence.
