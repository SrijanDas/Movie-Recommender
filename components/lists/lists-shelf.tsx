"use client";

import { motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Poster } from "@/components/movies/poster";
import { IN_VIEW, RISE, stagger } from "@/components/site/motion-variants";
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

// The fan's motion. Scrolled into view, the hand deals open from a stack
// behind the front card; hovered, it spreads and the front card lifts; pressed,
// it closes a little under the thumb. Side cards sit 59% of their own width
// from the front card, which is where "hidden" stacks them.
const SPRING = { type: "spring", bounce: 0.25, duration: 0.5 } as const;
const DEAL = { duration: 0.6, ease: [0.16, 1, 0.3, 1] } as const;
const side = (dir: -1 | 1) => ({
  hidden: { x: `${-dir * 59}%`, rotate: 0, opacity: 0 },
  show: { x: "0%", y: 0, rotate: dir * 8, opacity: 1, transition: DEAL },
  hover: { x: `${dir * 7}%`, y: 4, rotate: dir * 13, transition: SPRING },
  press: { x: `${-dir * 4}%`, y: 0, rotate: dir * 6, transition: { duration: 0.12 } },
});
const FRONT = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, scale: 1, opacity: 1, transition: DEAL },
  hover: { y: -6, scale: 1.04, transition: SPRING },
  press: { y: 0, scale: 0.97, transition: { duration: 0.12 } },
};
const LEFT = side(-1);
const RIGHT = side(1);
// Hover and press make each card its own animation root, so it watches its own
// way into view; `index` deals a shelf's cards in left to right.
const CARD = {
  hidden: {},
  show: (index: number) => ({ transition: { delayChildren: Math.min(index * 0.08, 0.4) } }),
};

// Three posters fanned like a hand of cards, as on the share image: the first
// film in front, the next two behind it.
function Fan({ posters }: { posters: ListCard["posters"] }) {
  const [first, second, third] = posters;
  const card = "shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-[border-color] duration-300 group-hover/list:border-hairline-soft/50";
  return (
    <div className="relative aspect-[5/4] w-full" aria-hidden>
      {third && (
        <motion.div variants={LEFT} className="absolute top-2 left-0 w-[46%]">
          <Poster path={third.posterPath} title={third.title} size="w185" sizes="80px" className={card} />
        </motion.div>
      )}
      {second && (
        <motion.div variants={RIGHT} className="absolute top-2 right-0 w-[46%]">
          <Poster path={second.posterPath} title={second.title} size="w185" sizes="80px" className={card} />
        </motion.div>
      )}
      {first ? (
        <motion.div variants={FRONT} className="absolute top-0 left-[27%] z-10 w-[46%]">
          <Poster
            path={first.posterPath}
            title={first.title}
            size="w185"
            sizes="80px"
            className={cn(card, "group-hover/list:shadow-[0_14px_28px_rgba(0,0,0,0.55)]")}
          />
        </motion.div>
      ) : (
        <div className="absolute inset-x-[27%] top-0 aspect-2/3 rounded-xl border border-dashed border-border" />
      )}
    </div>
  );
}

const TILE = "flex w-40 shrink-0 snap-start flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const MotionLink = motion.create(Link);

// A horizontal shelf of cards, bleeding to the page edge on phones. Cards and
// tiles on it come in the first time it scrolls into view.
export function CardShelf({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <motion.ul
      {...IN_VIEW}
      variants={stagger(0.08)}
      aria-label={label}
      className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6"
    >
      {children}
    </motion.ul>
  );
}

// One card on a shelf: three posters fanned, a title and a line under it.
export function FanCard({
  href,
  posters,
  title,
  index = 0,
  children,
}: {
  href: string;
  // Its place on the shelf.
  index?: number;
  posters: ListCard["posters"];
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      {...IN_VIEW}
      custom={index}
      variants={CARD}
      whileHover="hover"
      whileFocus="hover"
      whileTap="press"
      className={cn(TILE, "group/list")}
    >
      <Fan posters={posters} />
      <motion.span variants={RISE} className="flex flex-col gap-1">
        <span className="line-clamp-2 text-body-sm font-semibold text-ink transition-colors group-hover/list:text-primary-soft">
          {title}
        </span>
        <span className="flex items-center gap-2 text-caption text-mute">{children}</span>
      </motion.span>
    </MotionLink>
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
      {lists.map((list, i) => (
        <li key={list.id} className="flex">
          <FanCard href={list.path} posters={list.posters} title={list.name} index={i}>
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
        <motion.li variants={RISE} className="flex">
          <Link href="/lists/new" className={cn(TILE, "group/new")}>
            <span className="flex aspect-[5/4] w-full items-center justify-center rounded-xl border border-dashed border-border text-mute transition-colors group-hover/new:border-hairline-soft/50 group-hover/new:text-ink">
              <PlusIcon className="size-6" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-body-sm font-semibold text-ink group-hover/new:text-primary-soft">New list</span>
              <span className="text-caption text-mute">Any films, your order</span>
            </span>
          </Link>
        </motion.li>
      )}
    </CardShelf>
  );
}
