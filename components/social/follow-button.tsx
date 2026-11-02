"use client";

import { CheckIcon, UserRoundPlusIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setFollowing } from "@/app/social/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Follow / Following, one tap each way. The button is the feedback: it flips
// at once and only flips back if the save fails.
export function FollowButton({
  userId,
  name,
  following,
  size = "default",
  className,
}: {
  userId: string;
  name: string;
  following: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  const [saved, setSaved] = useState(following);
  const [shown, setShown] = useOptimistic(saved, (_, next: boolean) => next);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !shown;
      setShown(next);
      const result = await setFollowing(userId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(next);
    });

  return (
    <Button
      variant={shown ? "outline" : "default"}
      size={size}
      aria-pressed={shown}
      aria-label={shown ? `Unfollow ${name}` : `Follow ${name}`}
      title={shown ? "Tap to unfollow" : undefined}
      onClick={toggle}
      className={cn(size === "lg" && "px-3 text-body-sm font-semibold", shown && "text-body hover:text-ink", className)}
    >
      {shown ? <CheckIcon className="text-primary-soft" /> : <UserRoundPlusIcon />}
      {shown ? "Following" : "Follow"}
    </Button>
  );
}
