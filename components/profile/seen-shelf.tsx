"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { createContext, use, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveHiddenSeen } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Visibility = { hidden: (answer: string) => boolean; toggle: (answer: string, shown: boolean) => void };

const VisibilityContext = createContext<Visibility | null>(null);

// Holds the owner's unsaved Seen it switches for a page, and the Save bar that
// appears once one changes. Nothing saves until Save; Cancel puts them back.
// Renders its children then the bar, so the bar sticks to the bottom of the
// page around it.
export function SeenVisibility({ hidden, children }: { hidden: string[]; children: React.ReactNode }) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, startSaving] = useTransition();
  const current = draft ?? hidden;
  const dirty = draft !== null && (draft.length !== hidden.length || draft.some((a) => !hidden.includes(a)));

  const value: Visibility = {
    hidden: (answer) => current.includes(answer),
    toggle: (answer, shown) => setDraft(shown ? current.filter((a) => a !== answer) : [...current, answer]),
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveHiddenSeen(current).catch(() => null);
      if (!result?.ok) {
        toast.error("We couldn’t save that. Try again.");
        return;
      }
      setDraft(null);
      toast.success("Profile saved");
    });

  return (
    <VisibilityContext value={value}>
      {children}
      {dirty && (
        <div className="sticky bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] duration-200 ease-out animate-in fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
            <p className="min-w-0 flex-1 truncate text-body-sm text-mute" aria-live="polite">
              Not saved yet.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="px-3 text-body-sm text-body"
              onClick={() => setDraft(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" size="lg" className="px-4 text-body-sm font-semibold" onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              Save
            </Button>
          </div>
        </div>
      )}
    </VisibilityContext>
  );
}

// The owner's switch that shows or hides one Seen it list for everyone else,
// under its card on their profile and on the list's own page. Must sit inside
// SeenVisibility, which saves it. A hidden card stays on the owner's profile,
// dimmed (`children`), so it can be switched back on.
export function SeenToggle({
  answer,
  label,
  className,
  children,
}: {
  answer: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const visibility = use(VisibilityContext);
  if (!visibility) throw new Error("SeenToggle must be inside SeenVisibility");
  const shown = !visibility.hidden(answer);
  const id = `seen-${answer}`;

  return (
    <div className={cn("flex flex-col gap-1", children && "flex-1", className)}>
      {children && <div className={cn("flex transition-opacity duration-200", !shown && "opacity-40")}>{children}</div>}
      {/* mt-auto: on a shelf, every switch lines up however the titles wrap. */}
      <label htmlFor={id} className="mt-auto flex min-h-11 cursor-pointer items-center justify-between gap-2.5 self-stretch">
        <span className="text-body-sm text-mute">{shown ? "On profile" : "Hidden"}</span>
        <Switch
          id={id}
          checked={shown}
          onCheckedChange={(on) => visibility.toggle(answer, on)}
          aria-label={`Show ${label} on your profile`}
        />
      </label>
    </div>
  );
}
