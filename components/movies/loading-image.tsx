"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// A `fill` image with a pulsing skeleton behind it until it loads (or fails).
// The skeleton sits underneath rather than hiding the image, so an image that
// loaded before hydration is never stuck invisible.
export function LoadingImage({ alt, onLoad, onError, ...props }: ImageProps) {
  const [done, setDone] = useState(false);
  return (
    <>
      {!done && <Skeleton aria-hidden className="absolute inset-0 rounded-none" />}
      <Image
        {...props}
        alt={alt}
        onLoad={(e) => {
          setDone(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setDone(true);
          onError?.(e);
        }}
      />
    </>
  );
}
