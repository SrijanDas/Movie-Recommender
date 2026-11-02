"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { followingAction, searchPeopleAction } from "@/app/social/actions";
import { SearchField } from "@/components/movies/search-field";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { PeopleSkeleton } from "@/components/social/people-search";
import { MIN_PEOPLE_QUERY, type Person } from "@/lib/social/rules";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

// Pick one person: the people you follow, or anyone by name or username.
// Loads the follow list when it mounts (the sheet opens), so pages that
// offer it don't fetch it up front.
export function PeoplePicker({ value, onChange }: { value: Person | null; onChange: (person: Person | null) => void }) {
  const [following, setFollowing] = useState<Person[] | null>(null);
  const [query, setQueryState] = useState("");
  const [found, setFound] = useState<{ query: string; results: Person[] }>({ query: "", results: [] });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let live = true;
    followingAction().then((people) => live && setFollowing(people));
    return () => {
      live = false;
      clearTimeout(timer.current);
    };
  }, []);

  const setQuery = (raw: string) => {
    setQueryState(raw);
    clearTimeout(timer.current);
    const next = raw.trim();
    if (next.replace(/^@+/, "").length < MIN_PEOPLE_QUERY) return;
    timer.current = setTimeout(async () => {
      const hits = await searchPeopleAction(next);
      setFound((prev) => (prev.query === next ? prev : { query: next, results: hits }));
    }, DEBOUNCE_MS);
  };

  const trimmed = query.trim();
  const active = trimmed.replace(/^@+/, "").length >= MIN_PEOPLE_QUERY;
  const loading = active ? found.query !== trimmed : following === null;
  const results = active ? (found.query === trimmed ? found.results : []) : (following ?? []);
  // The pick stays on top while it isn't in the list shown.
  const shown = value && !results.some((p) => p.userId === value.userId) ? [value, ...results] : results;

  return (
    <>
      <SearchField value={query} onChange={setQuery} loading={loading} placeholder="Name or username" />
      <section aria-label={active ? `People matching ${trimmed}` : "People you follow"} className="flex flex-col gap-2">
        <h3 className="text-body-sm font-semibold text-mute">{active ? `People matching “${trimmed}”` : "People you follow"}</h3>
        {loading && shown.length === 0 ? (
          <PeopleSkeleton rows={3} />
        ) : shown.length === 0 ? (
          <p className="max-w-md py-6 text-center text-body-sm text-pretty text-mute">
            {active ? `No one matches “${trimmed}”. Try their username.` : "You don’t follow anyone yet. Search by name or username."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="listbox" aria-label="Send to">
            {shown.map((p) => {
              const picked = value?.userId === p.userId;
              const name = p.displayName ?? p.handle;
              return (
                <li key={p.userId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={picked}
                    onClick={() => onChange(picked ? null : p)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      picked ? "text-ink-strong" : "text-ink hover:text-primary-soft",
                    )}
                  >
                    <ProfileAvatar avatar={p.avatar} name={name} className={cn("size-11 shrink-0", picked && "ring-2 ring-primary")} />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-body-md">{name}</span>
                      <span className="truncate text-caption text-mute">@{p.handle}</span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                        picked ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                      )}
                      aria-hidden
                    >
                      <CheckIcon className="size-4" strokeWidth={3} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
