"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { saveFavoritesEdit } from "@/components/movies/movie-actions";
import { SortableFilmList } from "@/components/movies/sortable-film-list";
import { Button } from "@/components/ui/button";
import type { ListedMovie } from "@/lib/movies/types";

const sameOrder = (a: ListedMovie[], b: ListedMovie[]) =>
  a.length === b.length && a.every((m, i) => m.tmdbId === b[i].tmdbId);

// Rank favourites, loved most first: drag a grip (keyboard: focus it, Space,
// arrows, Space), pick a new position from a film's Move menu (the quick way
// to rank a new one, since they join at the bottom), or remove it. Nothing is saved
// until Done; Cancel, or leaving the page, discards the edit.
export function FavoritesEditor({ favorites }: { favorites: ListedMovie[] }) {
  // The unsaved edit, on top of the saved list; null when there is none, so
  // the page always shows the latest favourites (say, after adding some).
  const [draft, setOrder] = useState<ListedMovie[] | null>(null);
  const order = draft ?? favorites;
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  const removed = favorites.length - order.length;
  const dirty = draft !== null && !sameOrder(draft, favorites);

  // Next keeps this page mounted but hidden after you leave it (Cache
  // Components → <Activity>). Drop the draft on hide, so Cancel, a tab or
  // Back all discard it and the next visit starts from the saved list.
  useLayoutEffect(() => () => setOrder(null), []);

  // Warn before a reload or closing the tab throws away unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const done = () =>
    startSaving(async () => {
      if (dirty) {
        const result = await saveFavoritesEdit(order.map((m) => m.tmdbId));
        if (!result.ok) return;
      }
      router.push("/my-movies?show=favourites");
    });

  return (
    <>
      {order.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-mute">
          You’ve removed every favourite. Tap Done to save, or Cancel to keep them.
        </p>
      ) : (
        <SortableFilmList
          films={order}
          label="Favourites, loved most first"
          onReorder={setOrder}
          onRemove={(m) => setOrder(order.filter((o) => o.tmdbId !== m.tmdbId))}
        />
      )}

      {/* Sticky action bar: in thumb reach above the tab bar on phones. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-body-sm text-mute" aria-live="polite">
            {!dirty
              ? "No changes yet."
              : removed > 0
                ? `${removed} removed · not saved`
                : "Not saved yet."}
          </p>
          <Button
            variant="ghost"
            size="lg"
            className="px-3 text-body-sm text-body"
            render={<Link href="/my-movies?show=favourites" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button size="lg" className="px-4 text-body-sm font-semibold" disabled={saving} onClick={done}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
