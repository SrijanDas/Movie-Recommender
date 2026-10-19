"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Back where you came from; to `fallback` when the page was opened directly.
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-9 gap-1.5 self-start px-2 text-body-sm text-body", className)}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeftIcon />
      Back
    </Button>
  );
}
