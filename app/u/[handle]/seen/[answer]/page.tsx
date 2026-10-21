import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ANSWERS } from "@/components/movies/feedback";
import { PublicSeen } from "@/components/profile/public-seen";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { seenPath } from "@/lib/profile/rules";
import { loadSeenList } from "@/lib/profile/seen";
import { getMovie } from "@/lib/tmdb/client";

// One Seen it answer's films. Served at /@handle/seen/answer (next.config.ts
// rewrites it here) and open to signed-out visitors (proxy.ts), like the
// profile. An answer the owner hides from their profile is theirs alone.

type Params = PageProps<"/u/[handle]/seen/[answer]">["params"];

// Stills for the backdrop slideshow, from the newest films.
const BACKDROPS = 12;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle, answer } = await params;
  const seen = await loadSeenList(handle, answer);
  if (!seen || seen.hidden) return { title: "Not found" };
  const { profile, films } = seen;
  const name = profile.displayName ?? profile.handle;
  const label = ANSWERS.find((a) => a.feedback === seen.answer)!.label;
  const top = films.slice(0, 3).map((f) => f.title);
  const description =
    top.length > 0
      ? `${films.length} ${films.length === 1 ? "film" : "films"}: ${top.join(", ")}${films.length > 3 ? "…" : "."}`
      : `${name}’s films on Next Movie.`;
  const path = seenPath(profile.handle, seen.answer);
  return {
    title: `${label} · ${name} (@${profile.handle})`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${label} · ${name} on Next Movie`, description, type: "website", url: path },
    twitter: { card: "summary", title: `${label} · ${name}`, description },
  };
}

async function Seen({ params }: { params: Params }) {
  const { handle, answer } = await params;
  const seen = await loadSeenList(handle, answer);
  if (!seen) notFound();
  const viewer = await getCurrentUser();
  const owner = viewer?.id === seen.profile.userId;
  if (seen.hidden && !owner) notFound();
  // getMovie is cached for weeks and already warm for most saved films.
  const details = await Promise.all(seen.films.slice(0, BACKDROPS).map((f) => getMovie(f.tmdbId).catch(() => null)));
  const backdrops = details.map((d) => d?.backdrop_path).filter((p): p is string => Boolean(p));
  return (
    <PublicSeen
      profile={seen.profile}
      answer={seen.answer}
      films={seen.films}
      backdrops={backdrops}
      viewer={!viewer ? "visitor" : owner ? "owner" : "member"}
    />
  );
}

function SeenSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <Skeleton className="h-[clamp(13rem,38svh,24rem)] w-full rounded-none" />
      <div className="mx-auto -mt-16 flex w-full max-w-3xl flex-col gap-5 px-4 sm:px-6">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-24" />
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SeenPage({ params }: PageProps<"/u/[handle]/seen/[answer]">) {
  return (
    <Suspense fallback={<SeenSkeleton />}>
      <Seen params={params} />
    </Suspense>
  );
}
