# Styling & design system

← Back to [CLAUDE.md](../CLAUDE.md)

## The three UI rules

1. **[DESIGN.md](../DESIGN.md) is the design system.** Colors, type, radius, spacing, elevation, and component chrome come from it. Read it before any UI work; if code and DESIGN.md disagree, DESIGN.md wins.
2. **Use shadcn/ui components — never hand-roll one shadcn provides.** Add with `bunx --bun shadcn@latest add <name>` (e.g. `card`, `input`, `dialog`, `badge`, `sonner`). Compose and restyle them with Tailwind classes; only build a new component when shadcn has nothing close, and then build it *from* shadcn primitives.
3. **Generate UI through the `/impeccable` skill.** Every new screen, component composition, or visual change goes through it (it loads DESIGN.md as context and enforces the craft floor).

## shadcn setup

- Config: [components.json](../components.json) — style `base-nova`, built on **Base UI** (`@base-ui/react`, not Radix), icons from `lucide-react`, CSS variables on.
- Components land in `components/ui/`. They are owned source — edit them to match DESIGN.md rather than overriding with wrapper components.
- `cn()` comes from the `cn` package, re-exported by `lib/utils.ts`.
- Animations: `tw-animate-css` for shadcn's built-in enter/exit classes; **framer-motion** for everything authored. Shared easing and card presets live in [components/site/motion.tsx](../components/site/motion.tsx), and `MotionProvider` (root layout) sets `reducedMotion="user"`. Server components import `* as motion from "framer-motion/client"`. Motion explains a change (cards leaving a grid, the tab indicator sliding, a pick being ticked); don't add entrance animations to static sections. Base shadcn styles: `shadcn/tailwind.css`.

## How DESIGN.md maps to code

All tokens live in [app/globals.css](../app/globals.css).

**Dark only.** The brand has no light mode: `:root` holds the dark tokens, `<html>` always has the `dark` class (so shadcn's `dark:` variants apply), and `color-scheme: dark` is set. Don't add a light theme or a theme toggle.

| DESIGN.md | shadcn variable | Tailwind |
| --- | --- | --- |
| `primary` #00d992 | `--primary` | `bg-primary` |
| `on-primary` #101010 | `--primary-foreground` | `text-primary-foreground` |
| `canvas` #101010 | `--background`, `--card` | `bg-background` / `bg-canvas` |
| `canvas-soft` #1a1a1a | `--muted`, `--secondary`, `--accent`, `--popover` | `bg-muted` / `bg-canvas-soft` |
| `ink` #f2f2f2 | `--foreground` | `text-foreground` / `text-ink` |
| `mute` #8b949e | `--muted-foreground` | `text-muted-foreground` / `text-mute` |
| `hairline` #3d3a39 | `--border`, `--input` | `border-border` / `border-hairline` |
| `primary-soft` #2fd6a1 | `--ring` | `ring-ring` / `text-primary-soft` |

Brand-only colors without a shadcn slot are also utilities: `text-ink-strong`, `text-body`, `text-primary-deep` (inline links), `text-canvas-text-soft`, `border-hairline-soft`.

Prefer the shadcn semantic names inside components; use brand names when DESIGN.md calls for a role shadcn doesn't have.

**Type scale** (sizes carry their own line-height, tracking, weight): `text-display-xl` (60px hero), `text-display-lg` (36px section), `text-display-md`, `text-display-sm`, `text-body-lg`, `text-body-md` (body default), `text-body-sm`, `text-caption`, `text-code`, `text-eyebrow` (pair with `uppercase`). Hero is 32px on mobile: `text-[2rem] md:text-display-xl`.

**Fonts:** Inter (`font-sans`, `font-heading`) and Geist Mono as the SF Mono substitute (`font-mono`), both via `next/font` in `app/layout.tsx`. Mono is for code, commands, and numbers only.

**Radius:** `rounded-lg` = 6px (buttons, inputs — shadcn's default), `rounded-xl` = 8px (cards, code blocks), `rounded-full` only for status pills.

**Elevation:** 1px hairline border is the default; `shadow-glow` for hover/featured cards; `shadow-modal` for dialogs. Never border *and* a soft drop shadow, never material shadows.

**Spacing:** DESIGN.md is on a 4px base, which matches Tailwind's scale (`p-3` = 12px, `p-6` = 24px, `py-12` = 48px section bands).

## Don'ts (from DESIGN.md)

- Primary green is for CTAs, status, and live indicators — not body text or decoration.
- No second accent color, no gradients, no illustrations.
- Hero display stays at weight 400; never 700+.
- Don't swap Inter or the mono face.
- Use `next/image` for posters/backdrops and add hosts to `images.remotePatterns` in `next.config.ts`.
