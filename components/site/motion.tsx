"use client";

import { MotionConfig, type Transition } from "framer-motion";
import { EASE_OUT } from "@/components/site/motion-variants";

// The app's motion vocabulary. Routine changes are quick and decelerate into
// place; exits are faster than entrances. framer-motion skips transform and
// layout animation when the visitor asks for reduced motion, keeping fades.
// Presets server components can use live in motion-variants.ts.

// A card leaving a grid (rated, saved, removed) and arriving (new batch, Undo).
// Siblings slide into the gap with `layout="position"` under `popLayout`.
export const CARD_PRESENCE = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.18, ease: "easeIn" } },
} as const;

export const CARD_TRANSITION: Transition = {
  duration: 0.4,
  ease: EASE_OUT,
  layout: { duration: 0.35, ease: EASE_OUT },
};

// Lists that arrive as a batch stagger in, capped so a long batch never waits.
export const staggerDelay = (i: number) => Math.min(Math.max(i, 0) * 0.04, 0.3);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
