"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Back where you came from; to `fallback` when the page was opened directly.
// `iconOnly` drops the label, for a tight bar.
export function BackButton({ fallback, className, iconOnly }: { fallback: string; className?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.back() : router.push(fallback));
  if (iconOnly) {
    return (
      <Button variant="ghost" size="icon-lg" className={cn("-ml-2 size-11 text-body", className)} onClick={back} aria-label="Back">
        <ArrowLeftIcon className="size-5" />
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-9 gap-1.5 self-start px-2 text-body-sm text-body", className)}
      onClick={back}
    >
      <ArrowLeftIcon />
      Back
    </Button>
  );
}
