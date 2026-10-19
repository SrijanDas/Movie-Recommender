"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The bar's height (h-14), not counting the safe-area inset.
const BAR = 56;

// A public page's top bar for anyone who isn't the owner. Hidden while the
// page's own top (backdrop, name) is on screen; slides in as the element with
// `watchId` passes under where the bar sits. A page too short to scroll that
// far (a few films on a wide screen) shows it once scrolled to the end, and
// one that can't scroll at all shows it from the start. Visitors get one way
// in, members a way back to their picks.
export function ScrollHeader({ viewer, watchId }: { viewer: "member" | "visitor"; watchId: string }) {
  const [shown, setShown] = useState(false);
  const visitor = viewer === "visitor";

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    // Where the bar comes in, in page pixels; recomputed when the page's size
    // changes (posters loading in, a resize).
    let threshold = 0;
    const update = () => setShown(window.scrollY >= threshold);
    const measure = () => {
      const passed = target.getBoundingClientRect().bottom + window.scrollY - BAR;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      threshold = Math.max(0, Math.min(passed, maxScroll - 1));
      update();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
    };
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
