"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { markStarted } from "@/components/movies/movie-actions";
import { Button } from "@/components/ui/button";

// How long the browser gets to hand off to an installed app before the
// web version opens instead. Long enough for a slow phone, short enough
// not to feel stuck.
const APP_HANDOFF_MS = 1200;

// One "Where to watch" chip. Opens the service in a new tab, and, for a
// signed-in viewer (`tracked`), records that they started the film so the
// app can ask how it went next time it opens. With `appHref`, it tries the
// installed app first and falls back to `href` if nothing takes over.
export function WatchOption({
  tmdbId,
  title,
  label,
  href,
  appHref,
  logo,
  icon,
  tracked,
}: {
  tmdbId: number;
  title: string;
  label: string;
  href: string;
  appHref?: string;
  logo?: string | null;
  icon?: React.ReactNode;
  tracked: boolean;
}) {
  const handoff = useRef<number | null>(null);

  // The app took over (the page lost focus or was hidden): keep the web
  // version from opening on top of it when the user comes back.
  useEffect(() => {
    const cancel = () => {
      if (handoff.current !== null) {
        window.clearTimeout(handoff.current);
        handoff.current = null;
      }
    };
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener("pagehide", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      cancel();
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener("pagehide", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, []);

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (tracked) void markStarted(tmdbId, label);
    if (!appHref) return;
    event.preventDefault();
    window.location.href = appHref;
    handoff.current = window.setTimeout(() => {
      handoff.current = null;
      if (document.visibilityState !== "visible") return;
      const tab = window.open(href, "_blank", "noopener");
      if (!tab) window.location.assign(href);
    }, APP_HANDOFF_MS);
  };

  return (
    <Button
      variant="outline"
      className="h-11 gap-2.5 rounded-lg pr-3.5 pl-1.5 text-body-sm font-normal text-ink"
      render={<a href={href} target="_blank" rel="noreferrer" onClick={onClick} />}
      nativeButton={false}
      aria-label={`${title} on ${label} (opens in a new tab)`}
    >
      {logo ? (
        <Image src={logo} alt="" width={32} height={32} className="size-8 rounded-md" />
      ) : icon ? (
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary-soft" aria-hidden>
          {icon}
        </span>
      ) : (
        <span className="size-8 rounded-md bg-canvas-soft" aria-hidden />
      )}
      {label}
    </Button>
  );
}
