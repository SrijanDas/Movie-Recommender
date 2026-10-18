"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "@bprogress/next/app";
import { Button } from "@/components/ui/button";

// Back where you came from; to `fallback` when the page was opened directly.
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-9 gap-1.5 self-start px-2 text-body-sm text-body"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeftIcon />
      Back
    </Button>
  );
}
