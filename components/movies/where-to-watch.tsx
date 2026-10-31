import { PlayIcon } from "lucide-react";
import { WatchOption } from "@/components/movies/watch-option";
import { getViewerRegion, regionName } from "@/lib/region";
import { getWatchProviders } from "@/lib/tmdb/client";
import { logoUrl } from "@/lib/tmdb/images";
import { providerLink } from "@/lib/tmdb/provider-links";
import type { TmdbProvider, TmdbRegionProviders } from "@/lib/tmdb/types";
import { STREMIO, stremioLinks } from "@/lib/watch/stremio";

// Most services sell and rent the same film, so those merge into one row.
const ROWS: { label: string; kinds: (keyof Omit<TmdbRegionProviders, "link">)[] }[] = [
  { label: "Free", kinds: ["free", "ads"] },
  { label: "Stream", kinds: ["flatrate"] },
  { label: "Rent or buy", kinds: ["rent", "buy"] },
];

function providersFor(offers: TmdbRegionProviders, kinds: (typeof ROWS)[number]["kinds"]) {
  const byId = new Map<number, TmdbProvider>();
  for (const kind of kinds) for (const p of offers[kind] ?? []) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p);
  return [...byId.values()].sort((a, b) => a.display_priority - b.display_priority);
}

// The film's services in the viewer's country, free options first. Every
// film with an IMDb id also gets a chip that opens it in Stremio (a free
// player; the app if installed, else its web version), ahead of the Free
// row. Each chip opens that service's search (see providerLink) and, for a
// member (`tracked`), marks the film as being watched. Renders nothing
// when TMDB is unreachable: the rest of the page still works.
export async function WhereToWatch({
  tmdbId,
  title,
  imdbId,
  tracked,
}: {
  tmdbId: number;
  title: string;
  imdbId: string | null;
  tracked: boolean;
}) {
  const [region, all] = await Promise.all([getViewerRegion(), getWatchProviders(tmdbId).catch(() => null)]);
  if (!all) return null;
  const offers = all[region];
  const country = regionName(region);
  const rows = offers
    ? ROWS.map((r) => ({ label: r.label, providers: providersFor(offers, r.kinds) })).filter(
        (r) => r.providers.length > 0 || (r.label === "Free" && imdbId),
      )
    : imdbId
      ? [{ label: "Free", providers: [] as TmdbProvider[] }]
      : [];
  const stremio = imdbId ? stremioLinks(imdbId) : null;

  return (
    <section aria-labelledby="where-to-watch" className="flex flex-col gap-3">
      <h2 id="where-to-watch" className="text-display-sm text-ink">
        Where to watch
      </h2>
      {rows.length === 0 ? (
        <p className="text-body-md text-body">Not streaming, renting or selling in {country} right now.</p>
      ) : (
        <dl className="flex flex-col gap-4">
          {rows.map(({ label, providers }) => (
            <div key={label} className="flex flex-col gap-2">
              <dt className="text-caption text-mute">{label}</dt>
              <dd>
                <ul className="flex flex-wrap gap-2">
                  {label === "Free" && stremio && (
                    <li>
                      <WatchOption
                        tmdbId={tmdbId}
                        title={title}
                        label={STREMIO}
                        href={stremio.web}
                        appHref={stremio.app}
                        icon={<PlayIcon className="size-4 fill-current" />}
                        tracked={tracked}
                      />
                    </li>
                  )}
                  {providers.map((p) => (
                    <li key={p.provider_id}>
                      <WatchOption
                        tmdbId={tmdbId}
                        title={title}
                        label={p.provider_name}
                        href={providerLink(p.provider_name, title)}
                        logo={logoUrl(p.logo_path)}
                        tracked={tracked}
                      />
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {rows.length > 0 && (
        <p className="text-caption text-mute">
          {offers ? `In ${country}.` : `Not streaming, renting or selling in ${country} right now.`}
        </p>
      )}
    </section>
  );
}
