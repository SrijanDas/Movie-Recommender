"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setSeenShown } from "@/app/profile/actions";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// One Seen it shelf on the owner's own profile, with a switch in its heading
// that shows or hides the list for everyone else. It saves at once; a hidden
// shelf stays here, dimmed, so it can be switched back on.
export function OwnerSeenShelf({
  answer,
  label,
  shown,
  heading,
  children,
}: {
  answer: string;
  label: string;
  shown: boolean;
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  const [optimistic, setOptimistic] = useOptimistic(shown);
  const [, startTransition] = useTransition();
  const id = `shelf-${answer}`;

  const toggle = (on: boolean) =>
    startTransition(async () => {
      setOptimistic(on);
      const result = await setSeenShown(answer, on).catch(() => null);
      if (!result?.ok) toast.error("We couldn’t save that. Try again.");
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        {heading}
        <label htmlFor={id} className="-my-2 flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5">
          <span className="text-body-sm text-mute">{optimistic ? "On profile" : "Hidden"}</span>
          <Switch id={id} checked={optimistic} onCheckedChange={toggle} aria-label={`Show ${label} on your profile`} />
        </label>
      </div>
      <div className={cn("transition-opacity duration-200", !optimistic && "opacity-40")}>{children}</div>
    </div>
  );
}
