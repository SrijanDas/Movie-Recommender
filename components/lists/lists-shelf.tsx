import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Poster } from "@/components/movies/poster";
import type { ListCard } from "@/lib/lists/public";
import { cn } from "@/lib/utils";

// A synced list follows its owner's films: say so, quietly, in the brand's
// one "live" colour.
export function LiveTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-caption font-medium text-body",
        className,
      )}
      title="Updates as their films change"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      Live
    </span>
  );
}

// Three posters fanned like a hand of cards, as on the share image: the first
// film in front, the next two behind it.
function Fan({ posters }: { posters: ListCard["posters"] }) {
  const [first, second, third] = posters;
  const card =
    "absolute top-2 w-[46%] shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-[transform,border-color] duration-300 ease-out group-hover/list:border-hairline-soft/50";
  return (
    <div className="relative aspect-[5/4] w-full" aria-hidden>
      {third && (
        <Poster
          path={third.posterPath}
          title={third.title}
          size="w185"
          sizes="80px"
          className={cn(card, "left-0 -rotate-8 group-hover/list:-translate-x-1 group-hover/list:-rotate-12")}
        />
      )}
      {second && (
        <Poster
          path={second.posterPath}
          title={second.title}
          size="w185"
          sizes="80px"
          className={cn(card, "right-0 rotate-8 group-hover/list:translate-x-1 group-hover/list:rotate-12")}
        />
      )}
      {first ? (
        <Poster
          path={first.posterPath}
          title={first.title}
          size="w185"
          sizes="80px"
          className={cn(card, "top-0 left-[27%] z-10 group-hover/list:-translate-y-1")}
        />
      ) : (
        <div className="absolute inset-x-[27%] top-0 aspect-2/3 rounded-xl border border-dashed border-border" />
      )}
    </div>
  );
}

const TILE = "flex w-40 shrink-0 snap-start flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// A horizontal shelf of cards, bleeding to the page edge on phones.
export function CardShelf({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul
      aria-label={label}
      className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6"
    >
      {children}
    </ul>
  );
}

// One card on a shelf: three posters fanned, a title and a line under it.
export function FanCard({
  href,
  posters,
  title,
  children,
}: {
  href: string;
  posters: ListCard["posters"];
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(TILE, "group/list")}>
      <Fan posters={posters} />
      <span className="flex flex-col gap-1">
        <span className="line-clamp-2 text-body-sm font-semibold text-ink group-hover/list:text-primary-soft">{title}</span>
        <span className="flex items-center gap-2 text-caption text-mute">{children}</span>
      </span>
    </Link>
  );
}

export function FilmCount({ n }: { n: number }) {
  return (
    <span>
      <span className="font-mono tabular-nums">{n}</span> {n === 1 ? "film" : "films"}
    </span>
  );
}

// Someone's shared lists, newest first, as a shelf of fanned cards. The owner
// also gets a tile to start a new one.
export function ListsShelf({ lists, owner }: { lists: ListCard[]; owner: boolean }) {
  return (
    <CardShelf>
      {lists.map((list) => (
        <li key={list.id} className="flex">
          <FanCard href={list.path} posters={list.posters} title={list.name}>
            <FilmCount n={list.count} />
            {list.synced && (
              <span className="flex items-center gap-1.5" title="Updates as their films change">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                Live
              </span>
            )}
          </FanCard>
        </li>
      ))}
      {owner && (
        <li className="flex">
          <Link href="/lists/new" className={cn(TILE, "group/new")}>
            <span className="flex aspect-[5/4] w-full items-center justify-center rounded-xl border border-dashed border-border text-mute transition-colors group-hover/new:border-hairline-soft/50 group-hover/new:text-ink">
              <PlusIcon className="size-6" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-body-sm font-semibold text-ink group-hover/new:text-primary-soft">New list</span>
              <span className="text-caption text-mute">Any films, your order</span>
            </span>
          </Link>
        </li>
      )}
    </CardShelf>
  );
}
