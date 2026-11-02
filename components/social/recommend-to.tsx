"use client";

import { CheckIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SearchResult } from "@/app/actions";
import { sendTip } from "@/app/social/actions";
import { Fan } from "@/components/lists/lists-shelf";
import { FilmGrid } from "@/components/movies/favorites-picker";
import { NoteField } from "@/components/social/send-to-friend";
import { SHEET_CONTENT, SheetBody, SheetFooter, SheetHeader } from "@/components/social/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListCard } from "@/lib/lists/public";
import { MAX_TIP_FILMS, type Person } from "@/lib/social/rules";
import { cn } from "@/lib/utils";

type Mode = "films" | "list";

// "Recommend" on someone's profile: pick a film or a few (your own films
// first, or search any), or one of your lists, add a note, send.
export function RecommendTo({
  person,
  starters,
  lists,
  className,
}: {
  person: Person;
  // Your own films, favourites first, to pick from before searching.
  starters: SearchResult[];
  // Your shared lists, newest first.
  lists: ListCard[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className={cn("text-body hover:text-ink", className)} onClick={() => setOpen(true)}>
        <SendIcon />
        Recommend
      </Button>
      <DialogContent showCloseButton={false} className={SHEET_CONTENT}>
        <RecommendForm person={person} starters={starters} lists={lists} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RecommendForm({
  person,
  starters,
  lists,
  onDone,
}: {
  person: Person;
  starters: SearchResult[];
  lists: ListCard[];
  onDone: () => void;
}) {
  const name = person.displayName ?? person.handle;
  const [mode, setMode] = useState<Mode>("films");
  const [picked, setPicked] = useState<SearchResult[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = (movie: SearchResult) => {
    if (picked.some((m) => m.tmdbId === movie.tmdbId)) setPicked(picked.filter((m) => m.tmdbId !== movie.tmdbId));
    else if (picked.length >= MAX_TIP_FILMS) toast(`That’s ${MAX_TIP_FILMS} films. Unpick one to swap it.`);
    else setPicked([...picked, movie]);
  };

  const ready = mode === "films" ? picked.length > 0 : !!listId;
  const send = () =>
    startTransition(async () => {
      const result = await sendTip({
        toUserId: person.userId,
        note,
        ...(mode === "films" ? { tmdbIds: picked.map((m) => m.tmdbId) } : { listId }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${name}`, { description: "It’s waiting on their watchlist." });
      onDone();
    });

  const status =
    mode === "films"
      ? picked.length === 0
        ? "Tap films to pick them"
        : `${picked.length} of ${MAX_TIP_FILMS} picked`
      : listId
        ? lists.find((l) => l.id === listId)?.name
        : "Pick a list";

  return (
    <>
      <SheetHeader title={`Recommend to ${name}`} description="A film or a few, or one of your lists. It shows up at the top of their watchlist.">
        {lists.length > 0 && (
          <ToggleGroup
            value={[mode]}
            onValueChange={(v) => v[0] && setMode(v[0] as Mode)}
            variant="outline"
            spacing={0}
            aria-label="What to send"
            className="w-fit"
          >
            <ToggleGroupItem value="films" className="h-9 px-4 text-body-sm aria-pressed:text-ink-strong">
              Films
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-9 px-4 text-body-sm aria-pressed:text-ink-strong">
              One of my lists
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </SheetHeader>
      <SheetBody className={cn(mode === "films" && "gap-5")}>
        {mode === "films" ? (
          <FilmGrid starters={starters} picked={picked} onToggle={toggle} />
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="listbox" aria-label="Your lists">
            {lists.map((list) => {
              const on = list.id === listId;
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => setListId(on ? null : list.id)}
                    className={cn(
                      "group/list flex w-full items-center gap-4 rounded-lg py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      on ? "text-ink-strong" : "text-ink hover:text-primary-soft",
                    )}
                  >
                    <span className="w-20 shrink-0">
                      <Fan posters={list.posters} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-body-md font-semibold">{list.name}</span>
                      <span className="text-caption text-mute">
                        <span className="font-mono tabular-nums">{list.count}</span> {list.count === 1 ? "film" : "films"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
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
      </SheetBody>
      <SheetFooter>
        <NoteField value={note} onChange={setNote} />
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-body-sm text-body" aria-live="polite">
            {status}
          </p>
          <Button
            disabled={!ready || pending}
            onClick={send}
            className="disabled:border-border disabled:bg-transparent disabled:text-mute disabled:opacity-100"
          >
            {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            Send
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
