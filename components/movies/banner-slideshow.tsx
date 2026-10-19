"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { backdropUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

// How long each still holds before the next fades in.
const HOLD_MS = 6000;

// The film page's banner: its stills, one after another, crossfading with a
// slow push-in. Each still is only fetched once the one before it is showing.
// Holds on the first still for reduced motion, or when there's only one.
export function BannerSlideshow({ paths, className }: { paths: string[]; className?: string }) {
  // Counts every change of still; it only grows, so it also says how far
  // the slideshow has got: the showing still and the next are mounted.
  const [step, setStep] = useState(0);
  const active = step % paths.length;
  const mounted = Math.min(step + 2, paths.length);

  useEffect(() => {
    if (paths.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setStep((n) => n + 1);
    }, HOLD_MS);
    return () => window.clearInterval(timer);
  }, [paths.length]);

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]",
        className,
      )}
    >
      {paths.slice(0, mounted).map((path, i) => (
        <Image
          key={path}
          src={backdropUrl(path)!}
          alt=""
          fill
          preload={i === 0}
          unoptimized
          sizes="100vw"
          className={cn(
            "object-cover object-[50%_35%] transition-[opacity,scale] ease-out motion-reduce:transition-none",
            i === active
              ? "scale-105 opacity-75 duration-[1500ms,7500ms]"
              : "scale-100 opacity-0 duration-[1500ms,0ms] delay-[0ms,1500ms]",
          )}
        />
      ))}
    </div>
  );
}
