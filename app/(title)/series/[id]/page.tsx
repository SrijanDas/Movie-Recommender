import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeriesVerdict } from "@/components/movies/series-verdict";
import { NO_MEDIA, NotConnected, parseId, TitleDetails, TitleShell } from "@/components/movies/title-page";
import { getCurrentUserId } from "@/lib/auth";
import { getSeriesSignal } from "@/lib/series/store";
import { getMovieMedia, getSeries, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import type { TmdbSeriesDetails } from "@/lib/tmdb/types";

// "2019–2023", "2019–" while it's still running, or "2019" for one that
// ended the year it began.
function years(series: TmdbSeriesDetails) {
  const start = releaseYear(series.first_air_date);
  if (!start) return null;
  const running = !["Ended", "Canceled"].includes(series.status);
  const end = running ? null : releaseYear(series.last_air_date);
  if (running) return `${start}–`;
  return end && end !== start ? `${start}–${end}` : String(start);
}

export async function generateMetadata({ params }: PageProps<"/series/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const series = id && isTmdbConfigured() ? await getSeries(id) : null;
  if (!series) return { title: "Series" };
  return { title: series.name, description: series.overview || undefined };
}

// A series' page: the film page's layout, with creators for directors and
// seasons for runtime. Members can save it or say how it was (user_series);
// visitors see it without actions, as on film pages.
async function SeriesDetails({ id: raw }: { id: string }) {
  if (!isTmdbConfigured()) return <NotConnected />;
  const id = parseId(raw);
  const series = id ? await getSeries(id) : null;
  if (!id || !series) notFound();
  const [userId, media] = await Promise.all([getCurrentUserId(), getMovieMedia(id, "tv").catch(() => NO_MEDIA)]);
  const saved = userId ? await getSeriesSignal(userId, id) : null;
  const seasons = series.number_of_seasons;

  return (
    <TitleDetails
      kind="tv"
      id={id}
      title={series.name}
      posterPath={series.poster_path}
      backdropPath={series.backdrop_path}
      tagline={series.tagline}
      overview={series.overview}
      genres={series.genres}
      rating={{ average: series.vote_average, count: series.vote_count }}
      facts={[years(series), seasons ? `${seasons} season${seasons === 1 ? "" : "s"}` : null].filter((f) => f !== null)}
      makers={{ role: "Creator", people: series.created_by }}
      cast={series.credits.cast}
      imdbId={series.external_ids?.imdb_id ?? null}
      media={media}
      actions={userId && <SeriesVerdict seriesId={id} title={series.name} saved={saved} />}
      // Series take weeks, so where-to-watch doesn't start a "Did you finish it?".
      tracked={false}
    />
  );
}

export default function SeriesPage({ params }: PageProps<"/series/[id]">) {
  return <TitleShell>{params.then(({ id }) => <SeriesDetails id={id} />)}</TitleShell>;
}
