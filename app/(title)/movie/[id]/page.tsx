import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MovieVerdict } from "@/components/movies/movie-verdict";
import { NO_MEDIA, NotConnected, parseId, TitleDetails, TitleShell } from "@/components/movies/title-page";
import { SendToFriend } from "@/components/social/send-to-friend";
import { getCurrentUserId } from "@/lib/auth";
import { getUserMovies } from "@/lib/movies/store";
import { getMovie, getMovieMedia, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";

function formatRuntime(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const movie = id && isTmdbConfigured() ? await getMovie(id) : null;
  if (!movie) return { title: "Film" };
  return { title: movie.title, description: movie.overview || undefined };
}

async function MovieDetails({ id: raw }: { id: string }) {
  if (!isTmdbConfigured()) return <NotConnected />;
  const id = parseId(raw);
  const movie = id ? await getMovie(id) : null;
  if (!id || !movie) notFound();

  // Signed-out visitors see the film without the actions (see layout.tsx).
  const [userId, media] = await Promise.all([getCurrentUserId(), getMovieMedia(id).catch(() => NO_MEDIA)]);
  const listed = userId ? (await getUserMovies(userId)).find((m) => m.tmdbId === id) : undefined;
  const year = releaseYear(movie.release_date);

  return (
    <TitleDetails
      kind="movie"
      id={id}
      title={movie.title}
      posterPath={movie.poster_path}
      backdropPath={movie.backdrop_path}
      tagline={movie.tagline}
      overview={movie.overview}
      genres={movie.genres}
      rating={{ average: movie.vote_average, count: movie.vote_count }}
      facts={[year, formatRuntime(movie.runtime)].filter((f) => f !== null).map(String)}
      makers={{ role: "Director", people: movie.credits.crew.filter((c) => c.job === "Director") }}
      cast={movie.credits.cast}
      imdbId={movie.external_ids?.imdb_id ?? null}
      media={media}
      tracked={!!userId}
      actions={
        userId && (
          // Review (Seen it) and share stay in view; the rest is in the ⋯ menu.
          <MovieVerdict
            tmdbId={id}
            snapshot={{ title: movie.title, posterPath: movie.poster_path, year }}
            saved={listed?.signal ?? null}
            seenAnswer={listed?.seenSignal ?? null}
            share={
              // One button: send to a friend in the app, or share the link anywhere.
              <SendToFriend
                films={[{ tmdbId: id, title: movie.title, posterPath: movie.poster_path, year }]}
                link={{ path: `/movie/${id}`, title: movie.title, text: year ? `${movie.title} (${year})` : movie.title }}
                size="icon"
                className="size-10 shrink-0 text-body hover:text-ink"
              />
            }
          />
        )
      }
    />
  );
}

export default function MoviePage({ params }: PageProps<"/movie/[id]">) {
  return <TitleShell>{params.then(({ id }) => <MovieDetails id={id} />)}</TitleShell>;
}
