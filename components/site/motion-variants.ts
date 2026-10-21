// Motion presets as plain data, so server components can pass them to
// `framer-motion/client` elements. Variant names: "hidden" → "show" for
// entrances; fanned cards add "hover" and "press".

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Children enter one after another.
export const stagger = (gap: number, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

// Plays once, when most of the element is on screen.
export const IN_VIEW = { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.4 } } as const;

export const RISE = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

// Text coming into focus, like a lens pulling.
export const FOCUS_IN = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: EASE_OUT } },
};

export const POP = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.3, duration: 0.6 } },
} as const;
