import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicList } from "@/components/lists/public-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { loadSharedList } from "@/lib/lists/public";
import { listPath } from "@/lib/lists/rules";
import { getMovie } from "@/lib/tmdb/client";
import { backdropUrl } from "@/lib/tmdb/images";

// A shared list. Served at /@handle/lists/slug (next.config.ts rewrites it
// here) and open to signed-out visitors (proxy.ts), like the profile.

type Params = PageProps<"/u/[handle]/lists/[slug]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle, slug } = await params;
  const shared = await loadSharedList(handle, slug);
  if (!shared) return { title: "List not found" };
  const { profile, list, films } = shared;
  const name = profile.displayName ?? profile.handle;
  const top = films.slice(0, 3).map((f) => f.title);
  const description =
    top.length > 0
      ? `${films.length} ${films.length === 1 ? "film" : "films"}: ${top.join(", ")}${films.length > 3 ? "…" : "."}`
      : `A list by ${name} on Next Movie.`;
  const title = `${list.name} · ${name} (@${profile.handle})`;
  const path = listPath(profile.handle, list.slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${list.name} · ${name} on Next Movie`, description, type: "website", url: path },
    twitter: { card: "summary_large_image", title: `${list.name} · ${name}`, description },
  };
}

async function List({ params }: { params: Params }) {
  const { handle, slug } = await params;
  const shared = await loadSharedList(handle, slug);
  if (!shared) notFound();
  const { profile, list, films } = shared;
  const [viewer, first] = await Promise.all([
    getCurrentUser(),
    films[0] ? getMovie(films[0].tmdbId).catch(() => null) : null,
  ]);
  return (
    <PublicList
      profile={profile}
      list={list}
      films={films}
      backdrop={backdropUrl(first?.backdrop_path ?? null)}
      viewer={!viewer ? "visitor" : viewer.id === profile.userId ? "owner" : "member"}
    />
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      <Skeleton className="h-[clamp(13rem,38svh,24rem)] w-full rounded-none" />
      <div className="mx-auto -mt-16 flex w-full max-w-3xl flex-col gap-5 px-4 sm:px-6">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-64" />
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

export default function SharedListPage({ params }: PageProps<"/u/[handle]/lists/[slug]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <List params={params} />
    </Suspense>
  );
}
