"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A public page's top bar for anyone who isn't the owner. Hidden while the
// page's own top (backdrop, name) is on screen; slides in once the element
// with `watchId` scrolls above the viewport. Visitors get one way in, members
// a way back to their picks.
export function ScrollHeader({ viewer, watchId }: { viewer: "member" | "visitor"; watchId: string }) {
  const [shown, setShown] = useState(false);
  const visitor = viewer === "visitor";

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <header
      inert={!shown}
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        "transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href={visitor ? "/" : "/recommendations"} />
        <Button size="sm" render={<Link href={visitor ? "/sign-up" : "/recommendations"} />} nativeButton={false}>
          {visitor ? "Make yours" : "Your picks"}
        </Button>
      </div>
    </header>
  );
}
