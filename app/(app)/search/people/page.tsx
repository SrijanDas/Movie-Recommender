import type { Metadata } from "next";
import { Suspense } from "react";
import { searchPeopleAction } from "@/app/social/actions";
import { PeopleSearch, PeopleSkeleton } from "@/components/social/people-search";
import { SearchTabs } from "@/components/social/search-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getFollowing } from "@/lib/social/store";

export const metadata: Metadata = { title: "Find people" };

// Search's People tab: find anyone by name or username and follow them.
async function People({ q }: { q: string }) {
  const userId = await requireUserId();
  const [following, results] = await Promise.all([getFollowing(userId), q ? searchPeopleAction(q) : []]);
  return (
    <PeopleSearch
      key={q}
      meId={userId}
      following={following.map((p) => ({ ...p, following: true }))}
      initial={{ query: q, results }}
    />
  );
}

export default function PeoplePage({ searchParams }: PageProps<"/search/people">) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-5 pb-8 sm:px-6 md:py-10">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">Search</h1>
      <SearchTabs active="people" />
      <Suspense
        fallback={
          <div className="flex flex-col gap-6 py-3" aria-hidden>
            <Skeleton className="h-12 rounded-lg" />
            <PeopleSkeleton />
          </div>
        }
      >
        {searchParams.then(({ q }) => (
          <People q={typeof q === "string" ? q.trim().slice(0, 60) : ""} />
        ))}
      </Suspense>
    </section>
  );
}
