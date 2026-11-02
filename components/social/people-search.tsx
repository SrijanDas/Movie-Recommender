"use client";

import { useEffect, useRef, useState } from "react";
import { searchPeopleAction, type FoundPerson } from "@/app/social/actions";
import { SearchField } from "@/components/movies/search-field";
import { FollowButton } from "@/components/social/follow-button";
import { PEOPLE_LIST, PersonRow } from "@/components/social/person-row";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_PEOPLE_QUERY } from "@/lib/social/rules";

const DEBOUNCE_MS = 250;

// Debounced people search; a slow answer to an old query never shows under
// a newer one. `initial` seeds a search already answered on the server.
function usePeopleSearch(initial: { query: string; results: FoundPerson[] }) {
  const [query, setQueryState] = useState(initial.query);
  const [found, setFound] = useState({ query: initial.query.trim(), results: initial.results });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const setQuery = (value: string) => {
    setQueryState(value);
    clearTimeout(timer.current);
    const next = value.trim();
    if (next.replace(/^@+/, "").length < MIN_PEOPLE_QUERY) return;
    timer.current = setTimeout(async () => {
      const hits = await searchPeopleAction(next);
      setFound((prev) => (prev.query === next ? prev : { query: next, results: hits }));
    }, DEBOUNCE_MS);
  };

  const trimmed = query.trim();
  const active = trimmed.replace(/^@+/, "").length >= MIN_PEOPLE_QUERY;
  return { query, setQuery, trimmed, active, results: found.query === trimmed ? found.results : [], loading: active && found.query !== trimmed };
}

export function PeopleSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className={PEOPLE_LIST} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-11 rounded-full" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </span>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

// Find anyone by name or username and follow them. Until you type it lists
// the people you follow. The query lives in the URL (?q=), so Back from a
// profile lands on the same results.
export function PeopleSearch({
  meId,
  following,
  initial,
}: {
  meId: string;
  following: FoundPerson[];
  initial: { query: string; results: FoundPerson[] };
}) {
  const { query, setQuery, trimmed, active, results, loading } = usePeopleSearch(initial);

  const search = (value: string) => {
    setQuery(value);
    const next = value.trim();
    window.history.replaceState(null, "", next ? `?q=${encodeURIComponent(next)}` : window.location.pathname);
  };

  const shown = active ? results : following;
  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <SearchField value={query} onChange={search} loading={loading} autoFocus={!initial.query} size="lg" placeholder="Name or username" />
      </div>

      <section aria-label={active ? `People matching ${trimmed}` : "People you follow"} className="flex flex-col gap-3">
        <h2 className="text-body-sm font-semibold text-mute" aria-live="polite">
          {active ? `People matching “${trimmed}”` : "People you follow"}
        </h2>
        {active && loading ? (
          <PeopleSkeleton />
        ) : active && results.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-mute">No one matches “{trimmed}”. Try their username.</p>
        ) : !active && following.length === 0 ? (
          <p className="max-w-md py-8 text-center text-body-sm text-pretty text-mute">
            Type a name or username to find someone. Once you follow people, they’ll be listed here.
          </p>
        ) : (
          <ul className={PEOPLE_LIST}>
            {shown.map((p) => (
              <PersonRow key={p.userId} person={p}>
                {p.userId !== meId && (
                  <FollowButton userId={p.userId} name={p.displayName ?? p.handle} following={p.following} size="lg" />
                )}
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
