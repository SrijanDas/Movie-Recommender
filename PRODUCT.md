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
2. **Get recommendations.** See a grid of films, each with the reasons it was picked ("Directed by Denis Villeneuve", "Stars Amy Adams").
3. **Give feedback.** 👍 a recommendation you like, 👎 one you don't, or mark it "Seen it".
4. **Add more over time.** Add other films you like whenever they come to mind.
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

Favourites picked on the home screen count most. Other liked films and 👍 add to your profile. 👎 counts against that film's director, cast and themes. "Seen it" only hides a film. Every change takes effect the next time you load your recommendations, so they improve as you use the app.

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
- 👍 / 👎 / "Seen it" feedback
- A "My movies" page to edit the list
- Anonymous use, plus email sign-in that keeps the anonymous list

**Later**
- Watchlist
- Where to stream each film
- Per-user attribute weights (for example, learning that one user follows directors more than actors)
- Sharing your favourites
- AI-written "why you'll like it" blurbs

## Success signals

- Share of recommendations that get a 👍 rather than a 👎
- Share of users who come back to add movies or give feedback
- Share of anonymous users who sign in to save

## Constraints

- Movie data comes from [TMDB](https://www.themoviedb.org/). Its free API is for non-commercial use and requires visible attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB"). Commercial use needs a TMDB licence.
