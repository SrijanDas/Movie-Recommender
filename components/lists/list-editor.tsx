"use client";

import { useRouter } from "@bprogress/next/app";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon, Share2Icon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { SearchResult } from "@/app/actions";
import { deleteListAction, saveListAction } from "@/app/lists/actions";
import type { RowFilm } from "@/components/movies/film-row";
import { AddFilmsSheet } from "@/components/movies/add-films-sheet";
import { SortableFilmList } from "@/components/movies/sortable-film-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MAX_LIST_FILMS, MAX_LIST_NAME, type ListSource } from "@/lib/lists/rules";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  synced: boolean;
  films: RowFilm[];
  // Synced lists: source films taken out, so they stay out as the source changes.
  hidden: number[];
};

const sameDraft = (a: Draft, b: Draft) =>
  a.name.trim() === b.name.trim() &&
  a.synced === b.synced &&
  a.films.length === b.films.length &&
  a.films.every((f, i) => f.tmdbId === b.films[i].tmdbId);

const filmCount = (n: number) => `${n} ${n === 1 ? "film" : "films"}`;

// Name a list, put its films in order, take some out or add any film, and
// choose whether it follows its source (the watchlist, or a My films filter)
// or stays a copy. Nothing saves until Save; Cancel, or leaving, discards.
export function ListEditor({
  listId,
  initial,
  source,
  filter,
  sourceIds,
  syncHint,
  copyHint,
  starters,
  cancelHref,
  deletedHref,
}: {
  // Set when editing a saved list.
  listId?: string;
  initial: Draft;
  source: ListSource | null;
  filter: string | null;
  // The films the source holds now: taking one out of a synced list hides it.
  sourceIds: number[];
  // What each mode does for this source, in a sentence or two.
  syncHint: string;
  copyHint: string;
  starters: SearchResult[];
  cancelHref: string;
  // Where to go once the list is deleted.
  deletedHref: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const d = draft ?? initial;
  const set = (patch: Partial<Draft>) => setDraft({ ...d, ...patch });
  const [saving, startSaving] = useTransition();
  const router = useRouter();
  const isNew = !listId;
  const dirty = draft !== null && !sameDraft(draft, initial);
  const inSource = new Set(sourceIds);
  const ids = new Set(d.films.map((f) => f.tmdbId));
  const room = MAX_LIST_FILMS - d.films.length;

  // Next keeps this page mounted but hidden after you leave it (Cache
  // Components → <Activity>). Drop the draft on hide, so the next visit
  // starts from the saved list.
  useLayoutEffect(() => () => setDraft(null), []);

  // Warn before a reload or closing the tab throws away unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const remove = (film: RowFilm) =>
    set({
      films: d.films.filter((f) => f.tmdbId !== film.tmdbId),
      hidden: inSource.has(film.tmdbId) ? [...d.hidden, film.tmdbId] : d.hidden,
    });

  const add = async (picks: SearchResult[]) => {
    const fresh = picks.filter((p) => !ids.has(p.tmdbId));
    const added = new Set(fresh.map((p) => p.tmdbId));
    set({ films: [...d.films, ...fresh], hidden: d.hidden.filter((id) => !added.has(id)) });
    toast.success(fresh.length === 1 ? `Added ${fresh[0].title}` : `Added ${fresh.length} films`, {
      description: "They’re at the end. Drag them where they belong.",
    });
    return true;
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveListAction({
        id: listId,
        name: d.name,
        source,
        filter,
        synced: d.synced,
        ids: d.films.map((f) => f.tmdbId),
        hiddenIds: d.hidden,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (isNew) toast.success("Your list is live", { description: "Share it from here, or find it on your profile." });
      else toast.success("List saved");
      router.push(result.path);
    });

  const canSave = d.name.trim().length > 0 && d.films.length > 0 && (isNew || dirty);

  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="list-name" className="text-body-sm font-semibold text-ink">
          Name
        </label>
        <Input
          id="list-name"
          value={d.name}
          onChange={(e) => set({ name: e.target.value })}
          maxLength={MAX_LIST_NAME}
          autoCapitalize="sentences"
          autoComplete="off"
          placeholder="Films to watch on a rainy day"
          className="h-12 bg-muted px-4 text-body-md md:text-body-md"
        />
      </div>

      {source && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-body-sm font-semibold text-ink">Update this list automatically?</legend>
          <p className="mb-1 text-caption text-mute">Either way, you can edit it yourself any time.</p>
          <ToggleGroup
            value={[d.synced ? "sync" : "copy"]}
            onValueChange={(value: string[]) => {
              if (value[0]) set({ synced: value[0] === "sync" });
            }}
            className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            aria-label="Update this list automatically?"
          >
            <ModeOption value="sync" icon={<RefreshCwIcon />} title="Yes, keep it up to date" hint={syncHint} />
            <ModeOption value="copy" icon={<CopyIcon />} title="No, only when I edit it" hint={copyHint} />
          </ToggleGroup>
        </fieldset>
      )}

      <section aria-labelledby="list-films" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="list-films" className="text-body-sm font-semibold text-ink">
            {filmCount(d.films.length)}
          </h2>
          {room > 0 && (
            <AddFilmsSheet
              title="Add films"
              description="Search or tap any film. They join the end of your list."
              starters={starters}
              lockedReason={(m) => (ids.has(m.tmdbId) ? "In list" : null)}
              max={room}
              add={add}
            />
          )}
        </div>
        {d.films.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-body-sm text-mute">
            No films yet. Tap Add to pick some.
          </p>
        ) : (
          <SortableFilmList
            films={d.films}
            label={d.name.trim() || "Your list"}
            onReorder={(films) => set({ films })}
            onRemove={remove}
          />
        )}
      </section>

      {listId && <DeleteList listId={listId} name={initial.name} deletedHref={deletedHref} />}

      {/* Sticky action bar: in thumb reach above the tab bar on phones. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-body-sm text-mute" aria-live="polite">
            {!d.name.trim()
              ? "Name your list."
              : d.films.length === 0
                ? "Add a film to share."
                : isNew
                  ? "Not shared yet."
                  : dirty
                    ? "Not saved yet."
                    : "No changes yet."}
          </p>
          <Button
            variant="ghost"
            size="lg"
            className="px-3 text-body-sm text-body"
            render={<Link href={cancelHref} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button size="lg" className="px-4 text-body-sm font-semibold" disabled={saving || !canSave} onClick={save}>
            {saving ? <Loader2Icon className="animate-spin" /> : isNew ? <Share2Icon /> : <CheckIcon />}
            {isNew ? "Save & share" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}

// One of the two modes, as a card: what it's called and what it does.
function ModeOption({
  value,
  icon,
  title,
  hint,
}: {
  value: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <ToggleGroupItem
      value={value}
      className={cn(
        "flex h-auto w-full min-w-0 flex-col items-start gap-1 rounded-lg border border-border bg-transparent p-3 text-left whitespace-normal",
        "hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-primary/5 data-pressed:border-primary data-pressed:bg-primary/5",
        "[&_svg]:text-mute aria-pressed:[&_svg]:text-primary-soft data-pressed:[&_svg]:text-primary-soft",
      )}
    >
      <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
        {icon}
        {title}
      </span>
      <span className="pl-6 text-body-sm font-normal text-body">{hint}</span>
    </ToggleGroupItem>
  );
}

// Deleting breaks the shared link, so ask first.
function DeleteList({ listId, name, deletedHref }: { listId: string; name: string; deletedHref: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const remove = () =>
    startTransition(async () => {
      const result = await deleteListAction(listId);
      if (!result.ok) {
        toast.error("We couldn’t delete the list. Try again.");
        return;
      }
      setOpen(false);
      toast(`Deleted ${name}`);
      router.push(deletedHref);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="-ml-2 self-start px-2 text-body-sm text-mute hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        Delete list
      </Button>
      <DialogContent showCloseButton={false} className="gap-5 bg-background p-5 ring-border">
        <div className="flex flex-col gap-2">
          <DialogTitle className="text-display-sm text-ink-strong">Delete “{name}”?</DialogTitle>
          <DialogDescription className="text-body-sm text-body">
            Its link stops working for anyone you shared it with. Your films stay as they are.
          </DialogDescription>
        </div>
        <DialogFooter className="-mx-5 -mb-5 flex-row gap-2 border-border bg-transparent px-5 pt-4 pb-5 sm:justify-end">
          <DialogClose render={<Button variant="outline" className="flex-1 sm:flex-none" />}>Keep it</DialogClose>
          <Button variant="destructive" className="flex-1 sm:flex-none" disabled={pending} onClick={remove}>
            {pending && <Loader2Icon className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
