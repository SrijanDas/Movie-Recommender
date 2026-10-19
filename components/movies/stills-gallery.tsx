"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { backdropUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

// A row of the film's stills. Tapping one opens them all full-width, at that
// still, to swipe through (arrow keys and buttons on bigger screens).
export function StillsGallery({ paths, title }: { paths: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {paths.map((path, i) => (
          <li key={path} className="w-64 shrink-0 snap-start sm:w-72">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open still ${i + 1} of ${paths.length}`}
              className="group/still relative block aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted outline-none transition-[border-color] duration-200 hover:border-hairline-soft/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Image
                src={backdropUrl(path, "w780")!}
                alt=""
                fill
                unoptimized
                loading="lazy"
                sizes="288px"
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent overlayClassName="bg-black/85" className="w-full max-w-[calc(100%-1rem)] gap-3 border-0 bg-canvas p-0 pt-12 ring-0 sm:max-w-5xl sm:p-0 sm:pt-12">
          <DialogTitle className="sr-only">Stills from {title}</DialogTitle>
          {open !== null && (
            <Carousel setApi={setApi} opts={{ startIndex: open, loop: paths.length > 1 }}>
              <CarouselContent>
                {paths.map((path, i) => (
                  <CarouselItem key={path}>
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={backdropUrl(path)!}
                        alt={`Still ${i + 1} of ${paths.length} from ${title}`}
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 1024px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {paths.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 hidden bg-canvas/70 backdrop-blur-sm sm:inline-flex" />
                  <CarouselNext className="right-3 hidden bg-canvas/70 backdrop-blur-sm sm:inline-flex" />
                </>
              )}
            </Carousel>
          )}
          <p className={cn("pb-3 text-center font-mono text-code text-mute tabular-nums", paths.length < 2 && "sr-only")}>
            {current + 1} / {paths.length}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
