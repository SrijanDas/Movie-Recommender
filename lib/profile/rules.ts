// Profile field rules shared by the sign-up form, the profile editor and their
// Server Actions. Pure — safe on server and client.

export const MIN_HANDLE = 3;
export const MAX_HANDLE = 20;
export const MAX_BIO = 120;

// Lowercase letters, digits, "_" and ".", not starting or ending with "."
// and never two dots in a row.
const HANDLE = /^[a-z0-9_](?:[a-z0-9_]|\.(?!\.))*[a-z0-9_]$/;

// Words a handle can't be, so /@handle never reads like part of the app.
const RESERVED = new Set([
  "account", "admin", "api", "app", "auth", "help", "home", "login", "logout", "me", "movie", "movies",
  "my-movies", "nextmovie", "next_movie", "offline", "onboarding", "profile", "recommendations", "root",
  "lists", "search", "settings", "signin", "signup", "support", "system", "u", "user", "watchlist",
]);

// What the user typed, as it will be stored: no "@", no spaces, lowercase.
export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

// Why a (normalized) handle can't be used, or null when it can.
export function handleProblem(handle: string): string | null {
  if (handle.length < MIN_HANDLE) return `Use at least ${MIN_HANDLE} characters.`;
  if (handle.length > MAX_HANDLE) return `Keep it to ${MAX_HANDLE} characters.`;
  if (!HANDLE.test(handle)) return "Use letters, numbers, “_” and “.” (not at the start or end).";
  if (RESERVED.has(handle)) return "That one’s reserved. Try another.";
  return null;
}

// Handles to offer for a name, best first: "Srijan Das" → srijandas,
// srijan.das, srijan_das, srijan. The server adds digits when all are taken.
export function handleCandidates(name: string): string[] {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return [];
  const clip = (h: string) => h.slice(0, MAX_HANDLE).replace(/\.+$/, "");
  const options = [words.join(""), words.join("."), words.join("_"), words[0]].map(clip);
  if (words[0].length < MIN_HANDLE) options.push(clip(`${words[0]}films`));
  return [...new Set(options)].filter((h) => !handleProblem(h));
}

// The public link's path for a handle.
export const profilePath = (handle: string) => `/@${handle}`;
