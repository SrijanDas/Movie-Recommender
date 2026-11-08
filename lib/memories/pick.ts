// Which memories are due on a day, and the films in each. Pure — safe on
// server and client. All dates are UTC calendar days. See docs/memories.md.

import type { Memory, MemoryFilm, MemoryKind } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`; // month 0-11

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

// The UTC [start, end) of a month (0-11) or a whole year.
export const monthRange = (year: number, month: number): [Date, Date] => [
  new Date(Date.UTC(year, month, 1)),
  new Date(Date.UTC(year, month + 1, 1)),
];
export const yearRange = (year: number): [Date, Date] => [new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1))];

// The recaps due on `today`: on the 1st, the month just ended; on 1 January,
// the year just ended too.
export function recapsDue(today: Date): { kind: MemoryKind; period: string; range: [Date, Date] }[] {
  if (today.getUTCDate() !== 1) return [];
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = (month + 11) % 12;
  const due: { kind: MemoryKind; period: string; range: [Date, Date] }[] = [
    { kind: "month_recap", period: monthKey(prevYear, prevMonth), range: monthRange(prevYear, prevMonth) },
  ];
  if (month === 0) due.push({ kind: "year_recap", period: String(year - 1), range: yearRange(year - 1) });
  return due;
}

// Whether a film watched at `watchedAt` is an "on this day" memory for
// `today`: same month and day, an earlier year. Films watched on 29 February
// come back on 28 February in years without one.
export function isOnThisDay(watchedAt: Date, today: Date): boolean {
  if (watchedAt.getUTCFullYear() >= today.getUTCFullYear()) return false;
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  if (watchedAt.getUTCMonth() !== m) return false;
  if (watchedAt.getUTCDate() === d) return true;
  return m === 1 && d === 28 && watchedAt.getUTCDate() === 29 && !isLeap(today.getUTCFullYear());
}

// The "on this day" memory for one user's films, or null if none qualify.
// Most recent year first.
export function onThisDay(films: MemoryFilm[], today: Date): Memory | null {
  const hits = films
    .filter((f) => isOnThisDay(new Date(f.watchedAt), today))
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
  return hits.length ? { kind: "on_this_day", period: dayKey(today), films: hits } : null;
}

// A recap of the films watched in [start, end), in the order watched, or
// null if there were none.
export function recap(films: MemoryFilm[], kind: MemoryKind, period: string, [start, end]: [Date, Date]): Memory | null {
  const hits = films
    .filter((f) => {
      const t = new Date(f.watchedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    })
    .sort((a, b) => a.watchedAt.localeCompare(b.watchedAt));
  return hits.length ? { kind, period, films: hits } : null;
}

// Whole years between a film being watched and `today`, for "N years ago".
export const yearsAgo = (film: MemoryFilm, today: Date) =>
  today.getUTCFullYear() - new Date(film.watchedAt).getUTCFullYear();

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

// Default wording for a memory, for whichever channel delivers it.
export function memoryMessage(memory: Memory, today: Date): { title: string; body: string } {
  const [first] = memory.films;
  const n = memory.films.length;
  if (memory.kind === "on_this_day") {
    const ago = yearsAgo(first, today);
    const when = ago === 1 ? "A year ago today" : `${ago} years ago today`;
    return {
      title: when,
      body: n === 1 ? `You watched ${first.title}.` : `You watched ${first.title} and ${plural(n - 1, "other film")}.`,
    };
  }
  if (memory.kind === "month_recap") {
    const month = MONTHS[Number(memory.period.slice(5, 7)) - 1];
    return { title: `Your ${month} in films`, body: `You watched ${plural(n, "film")} in ${month}.` };
  }
  return { title: `Your ${memory.period} in films`, body: `You watched ${plural(n, "film")} in ${memory.period}.` };
}
