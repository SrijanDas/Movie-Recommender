"use client";

import { ChevronDownIcon, EyeIcon } from "lucide-react";
import { ANSWERS } from "@/components/movies/feedback";
import type { Feedback } from "@/components/movies/movie-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "Seen it" → how was it? Once answered (`current`), the trigger shows the
// answer and the menu ticks it, so picking another changes it.
export function SeenItMenu({
  title,
  current,
  onRate,
  variant = "default",
  disabled,
  className,
}: {
  title: string;
  current?: Feedback | null;
  onRate: (feedback: Feedback) => void;
  // compact: narrow cards, no leading icon. row: a quiet trigger at the end
  // of a list row; the label shows from sm up, the icon alone on phones.
  variant?: "default" | "compact" | "row";
  disabled?: boolean;
  className?: string;
}) {
  const answered = ANSWERS.find((a) => a.feedback === current);
  const TriggerIcon = answered?.icon ?? EyeIcon;
  const peak = answered?.feedback === "peak";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          variant === "row" ? (
            <Button
              variant="ghost"
              size="lg"
              className={cn(
                "gap-1 px-2 text-body-sm text-body hover:text-ink aria-expanded:bg-muted aria-expanded:text-ink",
                className,
              )}
              aria-label={answered ? `You said ${answered.label}. Change` : `How was ${title}?`}
              title={answered ? `${answered.label}. Tap to change` : "How was it?"}
            />
          ) : (
            <Button
              variant="outline"
              className={cn(
                "h-10 w-full text-body-sm aria-expanded:border-primary-soft",
                variant === "compact" && "gap-1 px-2",
                className,
              )}
              aria-label={answered ? `You said ${answered.label}. Change` : undefined}
            />
          )
        }
      >
        {variant !== "compact" && <TriggerIcon className={cn(peak && "text-primary-soft")} />}
        {variant === "row" ? (
          <span className="hidden sm:inline">{answered?.short ?? "Seen it"}</span>
        ) : (
          (answered?.label ?? "Seen it")
        )}
        <ChevronDownIcon className="text-mute" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "row" ? "end" : "start"} className="min-w-52 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-caption text-mute">How was {title}?</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={current ?? null}
            onValueChange={(next: Feedback) => {
              if (next !== current) onRate(next);
            }}
          >
            {ANSWERS.map(({ feedback, label, icon: Icon }) => (
              <DropdownMenuRadioItem
                key={feedback}
                value={feedback}
                closeOnClick
                className={cn(
                  "h-10 gap-2.5 pl-2 text-body-sm text-ink",
                  feedback === "peak" && "text-primary-soft data-highlighted:text-primary-soft",
                )}
              >
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
