"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setSeenShown } from "@/app/profile/actions";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// The owner's switch that shows or hides one Seen it list for everyone else,
// under its card on their profile and on the list's own page. It saves at
// once; a hidden card stays on the owner's profile, dimmed (`children`), so it
// can be switched back on.
export function SeenToggle({
  answer,
  label,
  shown,
  className,
  children,
}: {
  answer: string;
  label: string;
  shown: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [optimistic, setOptimistic] = useOptimistic(shown);
  const [, startTransition] = useTransition();
  const id = `seen-${answer}`;

  const toggle = (on: boolean) =>
    startTransition(async () => {
      setOptimistic(on);
      const result = await setSeenShown(answer, on).catch(() => null);
      if (!result?.ok) toast.error("We couldn’t save that. Try again.");
    });

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {children && <div className={cn("flex transition-opacity duration-200", !optimistic && "opacity-40")}>{children}</div>}
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-2.5 self-stretch">
        <span className="text-body-sm text-mute">{optimistic ? "On profile" : "Hidden"}</span>
        <Switch id={id} checked={optimistic} onCheckedChange={toggle} aria-label={`Show ${label} on your profile`} />
      </label>
    </div>
  );
}
