"use client";

import { ListIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendTip } from "@/app/social/actions";
import { Poster } from "@/components/movies/poster";
import { PeoplePicker } from "@/components/social/people-picker";
import { SHEET_CONTENT, SheetBody, SheetFooter, SheetHeader } from "@/components/social/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TIP_NOTE, type Person } from "@/lib/social/rules";
import type { TipFilm } from "@/lib/social/store";
import { cn } from "@/lib/utils";

type Sending = { films: TipFilm[]; list?: undefined } | { list: { id: string; name: string }; films?: undefined };

// "Send to a friend" for a film or a shared list: pick who, add a note,
// send. They see it on their watchlist.
export function SendToFriend({
  className,
  iconOnly,
  size = "default",
  films,
  list,
}: Sending & { className?: string; iconOnly?: boolean; size?: "default" | "lg" }) {
  const [open, setOpen] = useState(false);
  const sending: Sending = list ? { list } : { films: films ?? [] };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size={size}
        className={cn(size === "lg" && "px-3 text-body-sm font-semibold", iconOnly && "sm:px-4", className)}
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? "Send to a friend" : undefined}
      >
        <SendIcon />
        <span className={cn(iconOnly && "max-sm:sr-only")}>Send to a friend</span>
      </Button>
      <DialogContent showCloseButton={false} className={SHEET_CONTENT}>
        <SendForm {...sending} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SendForm({ onDone, ...sending }: Sending & { onDone: () => void }) {
  const { films, list } = sending;
  const [to, setTo] = useState<Person | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const title = list ? `Send “${list.name}”` : films.length === 1 ? `Send “${films[0].title}”` : `Send ${films.length} films`;

  const send = () =>
    startTransition(async () => {
      if (!to) return;
      const result = await sendTip({
        toUserId: to.userId,
        note,
        ...(list ? { listId: list.id } : { tmdbIds: films.map((f) => f.tmdbId) }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${to.displayName ?? to.handle}`, { description: "It’s waiting on their watchlist." });
      onDone();
    });

  return (
    <>
      <SheetHeader title={title} description="Pick who gets it. It shows up at the top of their watchlist.">
        <SendingPreview {...sending} />
      </SheetHeader>
      <SheetBody>
        <PeoplePicker value={to} onChange={setTo} />
      </SheetBody>
      <SheetFooter>
        <NoteField value={note} onChange={setNote} />
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-body-sm text-body" aria-live="polite">
            {to ? (
              <>
                To <span className="font-semibold text-ink">{to.displayName ?? to.handle}</span>
              </>
            ) : (
              "Pick someone to send it to"
            )}
          </p>
          <Button
            disabled={!to || pending}
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

// What's being sent, under the sheet's title: the posters or the list.
function SendingPreview({ films, list }: Sending) {
  if (list) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-body">
        <ListIcon className="size-4 text-mute" aria-hidden />
        A list, with its link
      </p>
    );
  }
  return (
    <ul className="flex gap-2" aria-label="Films to send">
      {films.slice(0, 6).map((f) => (
        <li key={f.tmdbId} className="w-10 shrink-0">
          <Poster path={f.posterPath} title={f.title} size="w92" sizes="40px" className="rounded-sm" />
        </li>
      ))}
      {films.length > 6 && (
        <li className="grid aspect-2/3 w-10 shrink-0 place-items-center rounded-sm border border-border font-mono text-caption text-mute tabular-nums">
          +{films.length - 6}
        </li>
      )}
    </ul>
  );
}

// The note that goes with a tip. Optional, short; the count shows once
// it's getting long.
export function NoteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const left = MAX_TIP_NOTE - value.length;
  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">Note (optional)</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_TIP_NOTE))}
        placeholder="Add a note (optional): “You’ll love the ending.”"
        rows={1}
        maxLength={MAX_TIP_NOTE}
        className="min-h-11 max-h-28 resize-none bg-muted text-body-md text-ink placeholder:text-mute"
      />
      {left <= 30 && (
        <span className={cn("self-end font-mono text-caption tabular-nums", left === 0 ? "text-ink" : "text-mute")} aria-live="polite">
          {left} left
        </span>
      )}
    </label>
  );
}
