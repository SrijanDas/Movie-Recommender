import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Seasons } from "@/components/movies/seasons";
import { SeriesVerdict } from "@/components/movies/series-verdict";
import { ShareButton } from "@/components/profile/share-profile";
import { NO_MEDIA, NotConnected, parseId, Section, TitleDetails, TitleShell } from "@/components/movies/title-page";
import { getCurrentUserId } from "@/lib/auth";
import { getSeriesSignal } from "@/lib/series/store";
import { getMovieMedia, getSeasonEpisodes, getSeries, isTmdbConfigured } from "@/lib/tmdb/client";
import { releaseYear } from "@/lib/tmdb/images";
import { previewMetadata, shareMessage } from "@/lib/tmdb/results";
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
  const when = years(series);
  return previewMetadata(
    `/series/${series.id}`,
    when ? `${series.name} (${when})` : series.name,
    shareMessage(series.name, when, series.tagline || series.overview),
    series.poster_path,
  );
}

// A series' page: the film page's layout, with creators for directors and
// seasons for runtime. Members can save it or say how it was (user_series);
// visitors see it without actions, as on film pages.
async function SeriesDetails({ id: raw }: { id: string }) {
  if (!isTmdbConfigured()) return <NotConnected />;
  const id = parseId(raw);
  const series = id ? await getSeries(id) : null;
  if (!id || !series) notFound();
  // Specials (season 0) go last; the picker opens on the first real season.
  const seasonList = [...(series.seasons ?? [])].sort(
    (a, b) => (a.season_number || Infinity) - (b.season_number || Infinity),
  );
  const firstSeason = seasonList[0]?.season_number;
  const [userId, media, firstEpisodes] = await Promise.all([
    getCurrentUserId(),
    getMovieMedia(id, "tv").catch(() => NO_MEDIA),
    firstSeason === undefined ? null : getSeasonEpisodes(id, firstSeason).catch(() => null),
  ]);
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
      actions={
        userId && (
          <SeriesVerdict
            seriesId={id}
            title={series.name}
            saved={saved}
            share={
              <ShareButton
                path={`/series/${id}`}
                title={series.name}
                text={shareMessage(series.name, years(series), series.tagline || series.overview)}
                label={`Share ${series.name}`}
                variant="outline"
                iconOnly
                className="size-10 shrink-0 text-body hover:text-ink"
              />
            }
          />
        )
      }
      // Series take weeks, so where-to-watch doesn't start a "Did you finish it?".
      tracked={false}
    >
      {firstSeason !== undefined && firstEpisodes && (
        <Section id="seasons" title={seasonList.length === 1 ? "Episodes" : "Seasons"}>
          <Seasons seriesId={id} seasons={seasonList} initial={{ season: firstSeason, episodes: firstEpisodes }} />
        </Section>
      )}
    </TitleDetails>
  );
}

export default function SeriesPage({ params }: PageProps<"/series/[id]">) {
  return <TitleShell>{params.then(({ id }) => <SeriesDetails id={id} />)}</TitleShell>;
}
