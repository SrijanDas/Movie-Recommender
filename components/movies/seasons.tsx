"use client";

import { useState, useTransition } from "react";
import { FilmRating } from "@/components/movies/film-meta";
import { LoadingImage } from "@/components/movies/loading-image";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSeasonAction } from "@/app/series/actions";
import { backdropUrl } from "@/lib/tmdb/images";
import type { TmdbEpisode, TmdbSeriesDetails } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils";

type Season = TmdbSeriesDetails["seasons"][number];

// Fixed locale and UTC so server and browser render the same text.
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// The series page's seasons: a row of season chips, then that season's
// episodes. The first season comes with the page; others load on tap and are
// kept, so switching back is instant.
export function Seasons({
  seriesId,
  seasons,
  initial,
}: {
  seriesId: number;
  seasons: Season[];
  initial: { season: number; episodes: TmdbEpisode[] };
}) {
  const [selected, setSelected] = useState(initial.season);
  const [loaded, setLoaded] = useState<Record<number, TmdbEpisode[]>>({ [initial.season]: initial.episodes });
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function pick(season: number) {
    setSelected(season);
    setFailed(false);
    if (loaded[season]) return;
    startTransition(async () => {
      const episodes = await getSeasonAction(seriesId, season);
      if (episodes) setLoaded((l) => ({ ...l, [season]: episodes }));
      else setFailed(true);
    });
  }

  const episodes = loaded[selected];
  const current = seasons.find((s) => s.season_number === selected);

  return (
    <div className="flex flex-col gap-4">
      {seasons.length > 1 && (
        <ToggleGroup
          value={[String(selected)]}
          onValueChange={(v) => v[0] && pick(Number(v[0]))}
          variant="outline"
          aria-label="Season"
          // The page's sideways shelf (SHELF in title-page.tsx).
          className="relative -mx-4 w-auto snap-x scroll-px-4 justify-start overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6"
        >
          {seasons.map((s) => (
            <ToggleGroupItem
              key={s.season_number}
              value={String(s.season_number)}
              className="h-9 shrink-0 snap-start rounded-full px-4 text-body-sm text-body aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-ink-strong"
            >
              {s.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {current && (
        <p className="font-mono text-code text-mute">
          {[
            seasons.length === 1 ? current.name : null,
            `${current.episode_count} episode${current.episode_count === 1 ? "" : "s"}`,
            current.air_date?.slice(0, 4),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {failed ? (
        <p className="text-body-md text-body">Couldn’t load this season. Tap it again to retry.</p>
      ) : pending || !episodes ? (
        <EpisodesSkeleton />
      ) : episodes.length === 0 ? (
        <p className="text-body-md text-body">No episodes listed yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {episodes.map((e) => (
            <Episode key={e.id} episode={e} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Episode({ episode: e }: { episode: TmdbEpisode }) {
  const [open, setOpen] = useState(false);
  const src = backdropUrl(e.still_path, "w300");
  const facts = [e.air_date ? DATE.format(new Date(e.air_date)) : null, e.runtime ? `${e.runtime}m` : null].filter(
    Boolean,
  );

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3 sm:gap-4">
        <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-canvas-soft sm:w-44">
          {src ? (
            <LoadingImage src={src} alt="" fill unoptimized loading="lazy" sizes="176px" className="object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center font-mono text-code text-mute">
              E{e.episode_number}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-body-md leading-snug font-semibold text-ink">
            <span className="mr-1.5 font-mono text-code font-normal text-mute">{e.episode_number}</span>
            {e.name}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-code text-mute tabular-nums">
            <FilmRating average={e.vote_average} count={e.vote_count} className="text-ink" />
            {facts.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </p>
        </div>
      </div>
      {e.overview && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-md text-left text-body-sm text-pretty text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className={cn(!open && "line-clamp-2")}>{e.overview}</span>
          <span className="sr-only">{open ? " Show less" : " Show more"}</span>
        </button>
      )}
    </li>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 sm:gap-4">
          <Skeleton className="aspect-video w-36 shrink-0 rounded-lg sm:w-44" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
