"use client";

import { ChevronDownIcon, EyeIcon } from "lucide-react";
import { ANSWERS } from "@/components/movies/feedback";
import type { Feedback } from "@/components/movies/movie-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "Seen it" → how was it? Once answered (`current`), the trigger shows the
// answer and the menu changes it.
export function SeenItMenu({
  title,
  current,
  onRate,
  className,
}: {
  title: string;
  current?: Feedback | null;
  onRate: (feedback: Feedback) => void;
  className?: string;
}) {
  const answered = ANSWERS.find((a) => a.feedback === current);
  const TriggerIcon = answered?.icon ?? EyeIcon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn("h-10 w-full text-body-sm aria-expanded:border-primary-soft", className)}
            aria-label={answered ? `You said ${answered.label}. Change` : undefined}
          />
        }
      >
        <TriggerIcon className={cn(answered?.feedback === "liked" && "text-primary-soft")} />
        {answered?.label ?? "Seen it"}
        <ChevronDownIcon className="text-mute" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-caption text-mute">How was {title}?</DropdownMenuLabel>
          {ANSWERS.map(({ feedback, label, icon: Icon }) => (
            <DropdownMenuItem
              key={feedback}
              className={cn(
                "h-10 gap-2.5 px-2 text-body-sm text-ink",
                feedback === "liked" && "text-primary-soft *:[svg]:text-primary-soft",
                feedback === current && "bg-accent",
              )}
              onClick={() => onRate(feedback)}
            >
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
