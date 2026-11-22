import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SearchResult } from "@/app/actions";
import { LoadingImage } from "@/components/movies/loading-image";
import { NotConnected, PAGE, parseId, initials, Section, TitleShell } from "@/components/movies/title-page";
import { TILE_GRID, TitleTile, titleHref } from "@/components/movies/title-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { getPerson, isTmdbConfigured } from "@/lib/tmdb/client";
import { profileUrl } from "@/lib/tmdb/images";
import { toResult } from "@/lib/tmdb/results";
import type { TmdbPerson, TmdbPersonCredit } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils";

// Talk shows, news and documentaries about them: appearances, not work.
const APPEARANCE_GENRES = new Set([10767, 10763]);
const AS_SELF = /\b(self|himself|herself|themselves)\b/i;
const DEPARTMENT: Record<string, string> = { Acting: "Actor", Directing: "Director", Writing: "Writer", Production: "Producer" };
const CREDITS_SHOWN = 60;

// Everything they acted in, directed, wrote… once each, best known first,
// with the role they had on it.
function filmography(person: TmdbPerson): { title: SearchResult; note: string }[] {
  const seen = new Map<string, { title: SearchResult; note: string }>();
  const credits: TmdbPersonCredit[] = [...person.combined_credits.cast, ...person.combined_credits.crew];
  for (const c of credits) {
    if (!c.poster_path || AS_SELF.test(c.character ?? "") || c.genre_ids.some((g) => APPEARANCE_GENRES.has(g))) continue;
    const title =
      c.media_type === "tv"
        ? toResult({ ...c, media_type: "tv", name: c.name ?? "", first_air_date: c.first_air_date ?? "" })
        : toResult({
            ...c,
            media_type: "movie",
            title: c.title ?? "",
            release_date: c.release_date ?? "",
            overview: "",
            popularity: 0,
            original_language: "",
          });
    const note = c.job ?? (c.character ? `as ${c.character}` : "");
    const key = titleHref(title);
    const had = seen.get(key);
    if (!had) seen.set(key, { title, note });
    else if (note && !had.note.includes(note)) had.note = had.note ? `${had.note}, ${note}` : note;
  }
  return [...seen.values()]
    .sort((a, b) => (b.title.voteCount ?? 0) - (a.title.voteCount ?? 0))
    .slice(0, CREDITS_SHOWN);
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function generateMetadata({ params }: PageProps<"/person/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const person = id && isTmdbConfigured() ? await getPerson(id) : null;
  if (!person) return { title: "Person" };
  return { title: person.name, description: person.biography.slice(0, 160) || undefined };
}

async function PersonDetails({ id: raw }: { id: string }) {
  if (!isTmdbConfigured()) return <NotConnected />;
  const id = parseId(raw);
  const person = id ? await getPerson(id) : null;
  if (!id || !person) notFound();

  const photo = profileUrl(person.profile_path, "h632");
  const works = filmography(person);
  const bio = person.biography.split(/\n+/).filter((p) => p.trim());
  const born = [person.birthday && `Born ${formatDate(person.birthday)}`, person.place_of_birth]
    .filter(Boolean)
    .join(" in ");

  return (
    <article className={cn(PAGE, "flex flex-col gap-10 pt-16 pb-10 md:pt-20")}>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="relative flex aspect-2/3 w-1/2 max-w-60 shrink-0 items-center justify-center self-start overflow-hidden rounded-xl border border-border bg-canvas-soft shadow-glow sm:w-60">
          {photo ? (
            <LoadingImage src={photo} alt={person.name} fill unoptimized preload sizes="(min-width: 640px) 240px, 50vw" className="object-cover object-top" />
          ) : (
            <span aria-hidden className="text-display-lg text-mute">
              {initials(person.name)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-display-md text-balance text-ink-strong md:text-display-lg">{person.name}</h1>
            {person.known_for_department && (
              <p className="text-body-md text-body">{DEPARTMENT[person.known_for_department] ?? person.known_for_department}</p>
            )}
          </div>
          {(born || person.deathday) && (
            <p className="text-body-sm text-mute">
              {born}
              {person.deathday && (
                <>
                  {born && <br />}
                  Died {formatDate(person.deathday)}
                </>
              )}
            </p>
          )}
          {bio.length > 0 && (
            <div className="flex max-w-prose flex-col gap-3 text-body-md text-pretty text-body">
              <p>{bio[0]}</p>
              {/* The rest folds away, so the films stay in reach on a phone. */}
              {bio.length > 1 && (
                <details className="group flex flex-col gap-3">
                  <summary className="cursor-pointer list-none text-body-sm font-semibold text-ink underline-offset-4 hover:underline group-open:hidden">
                    Read more
                  </summary>
                  <div className="flex flex-col gap-3">
                    {bio.slice(1).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      {works.length > 0 && (
        <Section id="known-for" title="Films and series">
          <ul className={TILE_GRID}>
            {works.map(({ title, note }, i) => (
              <TitleTile key={titleHref(title)} title={title} note={note} preload={i < 6} />
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function PersonSkeleton() {
  return (
    <div aria-hidden className={cn(PAGE, "flex flex-col gap-6 pt-16 sm:flex-row sm:gap-8 md:pt-20")}>
      <Skeleton className="aspect-2/3 w-1/2 max-w-60 rounded-xl sm:w-60" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export default function PersonPage({ params }: PageProps<"/person/[id]">) {
  return <TitleShell fallback={<PersonSkeleton />}>{params.then(({ id }) => <PersonDetails id={id} />)}</TitleShell>;
}
