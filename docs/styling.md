# Styling

← Back to [CLAUDE.md](../CLAUDE.md)

## Setup

- **Tailwind CSS v4**, configured CSS-first — there is no `tailwind.config.js` and no PostCSS config.
- `app/globals.css` starts with `@import "tailwindcss";` and is processed by the `@tailwindcss/turbopack` loader declared in `next.config.ts`.
- `globals.css` is imported once, in `app/layout.tsx`.

## Theme tokens

Defined in `app/globals.css`:

- `:root` sets `--background` / `--foreground`; a `prefers-color-scheme: dark` media query overrides them.
- `@theme inline` exposes them as Tailwind colors (`bg-background`, `text-foreground`) and maps fonts (`font-sans` → Geist, `font-mono` → Geist Mono).

To add a design token, declare the CSS variable in `:root` (plus its dark value) and register it in `@theme inline` — don't hard-code hex values in components.

## Fonts

Geist and Geist Mono load via `next/font/google` in `app/layout.tsx` and are attached as CSS variables on `<html>`. Note `body` in `globals.css` still sets `font-family: Arial, ...`; use the `font-sans` class (or remove that rule) to get Geist.

## Conventions

- Style with Tailwind utility classes; reach for custom CSS only for things utilities can't express.
- Dark mode currently follows the OS (`dark:` variant uses `prefers-color-scheme`). If a manual toggle is added, switch to a class-based variant with `@custom-variant` and document it here.
- Use `next/image` for images (posters, backdrops); configure `images.remotePatterns` in `next.config.ts` for any external image host.
