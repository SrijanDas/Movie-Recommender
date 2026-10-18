"use client";

import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import type { SearchResult } from "@/app/actions";
import { FilmGrid } from "@/components/movies/favorites-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// What the sheet is adding to. `add` saves the picks (in tap order) and
// resolves true once they're saved.
type Props = {
  title: string;
  description: string;
  starters: SearchResult[];
  lockedReason: (movie: SearchResult) => string | null;
  add: (picks: SearchResult[]) => Promise<boolean>;
};

function Picker({ title, description, starters, lockedReason, add, onDone }: Props & { onDone: () => void }) {
  const [picked, setPicked] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  const toggle = (movie: SearchResult) =>
    setPicked((p) => (p.some((m) => m.tmdbId === movie.tmdbId) ? p.filter((m) => m.tmdbId !== movie.tmdbId) : [...p, movie]));

  const submit = () =>
    startTransition(async () => {
      if (await add(picked)) onDone();
    });

  return (
    <>
      <header className="flex items-start gap-3 border-b border-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DialogTitle className="text-display-sm text-ink-strong">{title}</DialogTitle>
          <DialogDescription className="text-body-sm text-body">{description}</DialogDescription>
        </div>
        <DialogClose render={<Button variant="ghost" size="icon-lg" className="-mr-2 text-mute hover:text-ink" />}>
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <FilmGrid starters={starters} picked={picked} onToggle={toggle} lockedReason={lockedReason} />
      </div>

      <footer className="flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6">
        <p className="min-w-0 flex-1 text-body-sm text-body" aria-live="polite">
          {picked.length === 0 ? (
            "Tap films to pick them"
          ) : (
            <>
              <span className="font-semibold text-ink">{picked.length}</span> picked
            </>
          )}
        </p>
        <Button
          disabled={picked.length === 0 || pending}
          onClick={submit}
          className="disabled:border-border disabled:bg-transparent disabled:text-mute disabled:opacity-100"
        >
          {pending && <Loader2Icon className="animate-spin" />}
          {picked.length > 1 ? `Add ${picked.length} films` : "Add film"}
        </Button>
      </footer>
    </>
  );
}

// "Add films" button that opens the onboarding-style picker: search or tap
// any number of films, then add them all at once. Full screen on phones.
export function AddFilmsSheet(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="lg" className="px-3 text-body-sm font-semibold" onClick={() => setOpen(true)}>
        <PlusIcon />
        Add
      </Button>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(48rem,90dvh)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:ring-1"
      >
        <Picker {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
