// Shared lists: names, links and limits. Pure — safe on server and client, and
// imported by the DB schema (so relative imports only). See docs/lists.md.

// Where a list started.
export const LIST_SOURCES = ["watchlist", "my_films"] as const;
export type ListSource = (typeof LIST_SOURCES)[number];

export const MAX_LIST_NAME = 60;
export const MAX_LIST_FILMS = 200;

// "Peak films of 2024!" → "peak-films-of-2024". Never empty.
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || "list";
}

// The first of slug, slug-2, slug-3… that isn't taken.
export function freeSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const listPath = (handle: string, slug: string) => `/@${handle}/lists/${slug}`;
