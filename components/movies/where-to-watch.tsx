import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getViewerRegion, regionName } from "@/lib/region";
import { getWatchProviders } from "@/lib/tmdb/client";
import { logoUrl } from "@/lib/tmdb/images";
import type { TmdbProvider, TmdbRegionProviders } from "@/lib/tmdb/types";

// Per row; the rest sit behind a "+N more" chip to TMDB's full list.
const SHOWN = 6;

// Most services sell and rent the same film, so those merge into one row.
const ROWS: { label: string; kinds: (keyof Omit<TmdbRegionProviders, "link">)[] }[] = [
  { label: "Stream", kinds: ["flatrate"] },
  { label: "Free", kinds: ["free", "ads"] },
  { label: "Rent or buy", kinds: ["rent", "buy"] },
];

function providersFor(offers: TmdbRegionProviders, kinds: (typeof ROWS)[number]["kinds"]) {
  const byId = new Map<number, TmdbProvider>();
  for (const kind of kinds) for (const p of offers[kind] ?? []) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p);
  return [...byId.values()].sort((a, b) => a.display_priority - b.display_priority);
}

// The film's services in the viewer's country. TMDB gives one watch page per
// country (not per service), so every chip opens it. Renders nothing when
// TMDB is unreachable: the rest of the page still works.
export async function WhereToWatch({ tmdbId, title }: { tmdbId: number; title: string }) {
  const [region, all] = await Promise.all([getViewerRegion(), getWatchProviders(tmdbId).catch(() => null)]);
  if (!all) return null;
  const offers = all[region];
  const country = regionName(region);
  const rows = offers
    ? ROWS.map((r) => ({ label: r.label, providers: providersFor(offers, r.kinds) })).filter((r) => r.providers.length > 0)
    : [];

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
                  {providers.slice(0, SHOWN).map((p) => {
                    const logo = logoUrl(p.logo_path);
                    return (
                      <li key={p.provider_id}>
                        <Button
                          variant="outline"
                          className="h-11 gap-2.5 rounded-lg pr-3.5 pl-1.5 text-body-sm font-normal text-ink"
                          render={<a href={offers!.link} target="_blank" rel="noreferrer" />}
                          nativeButton={false}
                          aria-label={`${title} on ${p.provider_name} (opens in a new tab)`}
                        >
                          {logo ? (
                            <Image src={logo} alt="" width={32} height={32} className="size-8 rounded-md" />
                          ) : (
                            <span className="size-8 rounded-md bg-canvas-soft" aria-hidden />
                          )}
                          {p.provider_name}
                        </Button>
                      </li>
                    );
                  })}
                  {providers.length > SHOWN && (
                    <li>
                      <Button
                        variant="outline"
                        className="h-11 rounded-lg px-3.5 text-body-sm font-normal text-body"
                        render={<a href={offers!.link} target="_blank" rel="noreferrer" />}
                        nativeButton={false}
                        aria-label={`${providers.length - SHOWN} more services (opens in a new tab)`}
                      >
                        +{providers.length - SHOWN} more
                      </Button>
                    </li>
                  )}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-caption text-mute">
        In {country}. Data from{" "}
        <a
          href="https://www.justwatch.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          JustWatch
        </a>
        .
      </p>
    </section>
  );
}
