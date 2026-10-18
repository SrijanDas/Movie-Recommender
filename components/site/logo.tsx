import Link from "next/link";
import { cn } from "@/lib/utils";

// The brand mark: a "next" glyph on electric green. Same drawing as
// app/icon.svg and the PWA icons in public/icons.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="512" height="512" rx="112" className="fill-primary" />
      <g className="fill-primary-foreground">
        <path d="M150 156 Q150 138 166 147 L312 241 Q326 250 312 265 L166 359 Q150 368 150 350 Z" />
        <rect x="334" y="148" width="40" height="216" rx="10" />
      </g>
    </svg>
  );
}

export function Logo({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Next Movie home"
      className="-m-1 flex shrink-0 items-center gap-2.5 rounded-lg p-1 text-body-md font-semibold tracking-[-0.01em] text-ink-strong outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <LogoMark />
      Next Movie
    </Link>
  );
}
