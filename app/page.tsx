import { BookmarkPlusIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ANSWERS } from "@/components/movies/feedback";
import { Poster } from "@/components/movies/poster";
import { PlainHeader, TmdbAttribution } from "@/components/site/header";
import { LogoMark } from "@/components/site/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMovie, getStarterMovies, isTmdbConfigured } from "@/lib/tmdb/client";
import type { TmdbMovieSummary } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils";

// The public landing page. Signed-in visitors never see it: proxy.ts sends
// them to the app.

// TMDB's most-voted films, the same grid onboarding starts from. Fetched at
// request time (cached for weeks) so the build never depends on TMDB.
async function starters(): Promise<TmdbMovieSummary[]> {
  await connection();
  if (!isTmdbConfigured()) return [];
  return getStarterMovies().catch(() => []);
}

const COLUMNS = 8;
// Alternate speeds so the columns never line up.
const DURATIONS = ["95s", "120s", "105s", "130s", "100s", "115s", "125s", "110s"];
// Phones show 3 columns, tablets 4, laptops 6, wide screens 8.
const VISIBILITY = ["flex", "flex", "flex", "hidden sm:flex", "hidden lg:flex", "hidden lg:flex", "hidden xl:flex", "hidden xl:flex"];

// Full-bleed wall of posters drifting upward behind the hero, fading into
// the canvas where the headline sits. Static when motion is reduced.
async function PosterWall() {
  const films = await starters();
  if (films.length < COLUMNS * 3) return null;
  const columns = Array.from({ length: COLUMNS }, (_, c) => films.filter((_, i) => i % COLUMNS === c));
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,black_0%,black_30%,transparent_78%)] md:opacity-35 md:[mask-image:linear-gradient(to_bottom,black_0%,black_15%,transparent_70%)]"
    >
      <div className="-mx-[8%] -mt-[10%] grid origin-top -rotate-6 grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {columns.map((column, c) => (
          <div
            key={c}
            className={cn("animate-poster-drift flex-col gap-3", VISIBILITY[c], c % 2 === 1 && "mt-16")}
            style={{ "--drift-duration": DURATIONS[c] } as React.CSSProperties}
          >
            {/* Two copies, so translating by -50% loops seamlessly. */}
            {[...column, ...column].map((m, i) => (
              <Poster key={`${m.id}-${i}`} path={m.poster_path} title={m.title} sizes="(min-width: 1280px) 13vw, (min-width: 1024px) 18vw, 33vw" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  children,
  flip,
}: {
  n: number;
  title: string;
  body: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <li className="grid items-center gap-6 border-t border-border py-10 md:grid-cols-2 md:gap-16 md:py-16">
      <div className={cn("flex flex-col gap-3", flip && "md:order-2")}>
        <span className="font-mono text-code text-primary">{n}/3</span>
        <h3 className="text-display-md text-ink-strong text-balance md:text-display-lg">{title}</h3>
        <p className="max-w-md text-body-md text-pretty text-body">{body}</p>
      </div>
      <div className={cn("flex", flip && "md:order-1")}>{children}</div>
    </li>
  );
}

// Step 1: three real posters, ticked like the onboarding grid.
async function PickVisual() {
  const films = (await starters()).slice(0, 3);
  if (films.length < 3) return <Skeleton className="aspect-[3/1.6] w-full max-w-sm rounded-xl" />;
  return (
    <ul className="grid w-full max-w-sm grid-cols-3 gap-2.5">
      {films.map((m) => (
        <li key={m.id} className="relative">
          <Poster path={m.poster_path} title={m.title} sizes="120px" className="border-primary ring-2 ring-primary" />
          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-4" strokeWidth={3} aria-hidden />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Step 2: a real film with real reasons, built from its TMDB credits.
async function ReasonsVisual() {
  const film = (await starters())[7];
  const details = film ? await getMovie(film.id).catch(() => null) : null;
  if (!film || !details) return <Skeleton className="h-40 w-full max-w-sm rounded-xl" />;
  const director = details.credits.crew.find((c) => c.job === "Director")?.name;
  const leads = [...details.credits.cast].sort((a, b) => a.order - b.order).slice(0, 2).map((c) => c.name);
  const reasons = [director && `Directed by ${director}`, leads.length > 0 && `Stars ${leads.join(" and ")}`].filter(
    (r): r is string => Boolean(r),
  );
  return (
    <div className="flex w-full max-w-sm items-start gap-4 rounded-xl border border-border p-4">
      <Poster path={film.poster_path} title={film.title} sizes="96px" className="w-24 shrink-0" />
      <div className="flex min-w-0 flex-col gap-2.5">
        <p className="text-body-md font-semibold text-ink">{film.title}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Why it was picked">
          {reasons.map((r) => (
            <li key={r}>
              <Badge variant="outline" className="h-auto whitespace-normal px-2.5 py-1 text-left text-caption font-normal text-body">
                {r}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Step 3: the same answers the app asks, worst to best, plus the watchlist.
function FeedbackVisual() {
  return (
    <ul className="flex w-full max-w-sm flex-wrap gap-2" aria-label="Your answers">
      {ANSWERS.map(({ feedback, label, icon: Icon }) => (
        <li
          key={feedback}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-body-sm text-ink",
            feedback === "liked" && "border-primary-soft text-primary-soft",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </li>
      ))}
      <li className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-border px-3 text-body-sm text-body">
        <BookmarkPlusIcon className="size-4" aria-hidden />
        Not yet? Save it for later
      </li>
    </ul>
  );
}

function GetStarted({ className }: { className?: string }) {
  return (
    <Button render={<Link href="/sign-in" />} nativeButton={false} className={cn("h-12 px-6 text-body-md", className)}>
      Get started
    </Button>
  );
}

export default function LandingPage() {
  return (
    <>
      <PlainHeader>
        <Button variant="ghost" size="sm" className="h-9 text-body-sm text-body" render={<Link href="/sign-in" />} nativeButton={false}>
          Sign in
        </Button>
      </PlainHeader>

      <main className="flex flex-1 flex-col">
        <section className="relative isolate flex min-h-[calc(100svh-3.5rem-env(safe-area-inset-top))] flex-col justify-end overflow-hidden md:min-h-[44rem]">
          <Suspense fallback={null}>
            <PosterWall />
          </Suspense>
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-48 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:gap-6 md:px-8 md:pb-20">
            <h1 className="max-w-3xl text-[2rem] leading-[1.1] tracking-[-0.02em] text-balance text-ink-strong md:text-display-xl">
              Your next favourite film, with reasons.
            </h1>
            <p className="max-w-xl text-body-lg text-pretty text-body">
              Tap a few films you love. Next Movie tells you what to watch next and exactly why: the director, the cast, the
              themes you keep coming back to.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-5">
              <GetStarted className="w-full sm:w-auto" />
              <p className="text-center text-body-sm text-mute sm:text-left">Takes a minute. No ratings marathon.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="how" className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-16">
          <h2 id="how" className="pb-2 text-display-md text-ink-strong md:text-display-lg">
            How it works
          </h2>
          <ol>
            <Step
              n={1}
              title="Tap the films you love"
              body="Start from a grid of films most people have seen, or search for any title. Three is enough; ten sharpens it."
            >
              <Suspense fallback={<Skeleton className="aspect-[3/1.6] w-full max-w-sm rounded-xl" />}>
                <PickVisual />
              </Suspense>
            </Step>
            <Step
              n={2}
              flip
              title="See why each film was picked"
              body="Every recommendation shows what it shares with your favourites. No black box, no promoted titles."
            >
              <Suspense fallback={<Skeleton className="h-40 w-full max-w-sm rounded-xl" />}>
                <ReasonsVisual />
              </Suspense>
            </Step>
            <Step
              n={3}
              title="Say how it was, and it learns"
              body="Mark what you’ve seen with one tap. Loved it? More like that. Left midway? Fewer. Keep the rest on your watchlist."
            >
              <FeedbackVisual />
            </Step>
          </ol>
        </section>

        <section className="border-t border-dashed border-[rgba(79,93,117,0.4)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-8 md:py-20">
            <div className="flex items-start gap-4">
              <LogoMark className="size-12 rounded-xl" />
              <div className="flex flex-col gap-1.5">
                <h2 className="text-display-sm text-ink-strong md:text-display-md">Lives on your home screen</h2>
                <p className="max-w-md text-body-md text-body">
                  Install Next Movie like an app. It opens full screen, straight to tonight’s picks.
                </p>
              </div>
            </div>
            <GetStarted className="w-full md:w-auto" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-8">
          <TmdbAttribution className="text-body-sm text-mute" />
        </div>
      </footer>
    </>
  );
}
