"use client";

import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { videoThumbUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

// A 16:9 video that is only a thumbnail until tapped, so the page loads one
// image per video instead of a player. Tapping swaps in the privacy-enhanced
// embed, playing.
export function VideoPlayer({
  videoKey,
  label,
  sizes,
  large,
  className,
}: {
  videoKey: string;
  // What plays, for the button and the frame title: "Trailer for Heat".
  label: string;
  sizes: string;
  // The page's main trailer gets a bigger play button.
  large?: boolean;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl border border-border bg-muted", className)}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&playsinline=1`}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${label}`}
          className="group/play absolute inset-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <Image
            src={videoThumbUrl(videoKey)}
            alt=""
            fill
            unoptimized
            sizes={sizes}
            className="object-cover opacity-85 transition-opacity duration-200 group-hover/play:opacity-100"
          />
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-200 ease-out group-hover/play:scale-105 group-active/play:scale-95",
              large ? "size-16" : "size-11",
            )}
          >
            <PlayIcon className={cn("translate-x-px fill-current", large ? "size-6" : "size-4")} />
          </span>
        </button>
      )}
    </div>
  );
}
