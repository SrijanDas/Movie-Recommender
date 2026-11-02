"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// A task sheet: full screen on phones, a tall dialog on larger screens, with
// a header, a scrolling body and a footer pinned above the home indicator.
// Same frame as My films' "Add films" picker.
export const SHEET_CONTENT =
  "inset-0 top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(44rem,90dvh)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:ring-1";

export function SheetHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-5">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DialogTitle className="text-display-sm text-balance text-ink-strong">{title}</DialogTitle>
          {description && <DialogDescription className="text-body-sm text-body">{description}</DialogDescription>}
        </div>
        <DialogClose render={<Button variant="ghost" size="icon-lg" className="-mr-2 text-mute hover:text-ink" />}>
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
      {children}
    </header>
  );
}

export function SheetBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function SheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-col gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6",
        className,
      )}
    >
      {children}
    </footer>
  );
}
