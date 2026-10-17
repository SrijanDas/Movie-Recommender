"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { posterUrl, type PosterSize } from "@/lib/tmdb/images";

// A 2:3 poster frame. Falls back to the title set in type when TMDB has no
// art or the image fails to load.
export function Poster({
  path,
  title,
  size = "w342",
  sizes,
  className,
  preload,
}: {
  path: string | null;
  title: string;
  size?: PosterSize;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : posterUrl(path, size);
  return (
    <div
      className={cn(
        "relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      {src ? (
        // TMDB serves pre-sized posters from its CDN, so skip the optimizer.
        <Image
          src={src}
          alt={`Poster for ${title}`}
          fill
          sizes={sizes}
          preload={preload}
          unoptimized
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-end p-2">
          <span className="line-clamp-4 text-caption font-semibold text-body">{title}</span>
        </div>
      )}
    </div>
  );
}
