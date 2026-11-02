"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRightIcon, BookmarkPlusIcon, CheckIcon, SendIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { dismissTip, markInboxSeen } from "@/app/social/actions";
import { Fan } from "@/components/lists/lists-shelf";
import { watchLater } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { profilePath } from "@/lib/profile/rules";
import type { Signal } from "@/lib/recommend/types";
import { timeAgo } from "@/lib/social/rules";
import type { Tip } from "@/lib/social/store";
import { cn } from "@/lib/utils";

const POSTERS_SHOWN = 4;

// Films and lists friends sent you, at the top of the watchlist, newest
// first. Save puts a tip's films on the watchlist and clears it; Dismiss
// clears it. Opening the page marks them seen (the tab badge goes).
export function TipsShelf({ tips: initial, known }: { tips: Tip[]; known: Record<number, Signal> }) {
  const [tips, setTips] = useState(initial);
  const unseen = initial.some((t) => !t.seen);

  useEffect(() => {
    if (unseen) void markInboxSeen();
  }, [unseen]);

  const remove = (id: string) => setTips((list) => list.filter((t) => t.id !== id));

  if (tips.length === 0) return null;
  return (
    <section aria-labelledby="from-friends" className="flex flex-col gap-3">
      <h2 id="from-friends" className="flex items-center gap-2 text-display-sm text-ink-strong">
        <SendIcon className="size-5 text-primary" aria-hidden />
        From friends
      </h2>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-0.5 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6">
        <AnimatePresence initial={false}>
          {tips.map((tip) => (
            <TipCard key={tip.id} tip={tip} known={known} onGone={() => remove(tip.id)} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function TipCard({ tip, known, onGone }: { tip: Tip; known: Record<number, Signal>; onGone: () => void }) {
  const [pending, startTransition] = useTransition();
  const name = tip.from.displayName ?? tip.from.handle;
  const fresh = tip.films.filter((f) => !known[f.tmdbId]);
  const allKnown = tip.films.length > 0 && fresh.length === 0;

  const dismiss = () =>
    startTransition(async () => {
      const result = await dismissTip(tip.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onGone();
    });

  const save = () =>
    startTransition(async () => {
      const results = await Promise.all(fresh.map((f) => watchLater(f.tmdbId)));
      const saved = results.filter((r) => r.ok).length;
      if (saved === 0) return;
      await dismissTip(tip.id);
      toast.success(saved === 1 ? `${fresh[0].title} saved to your watchlist` : `${saved} films saved to your watchlist`);
      onGone();
    });

  return (
    <motion.li
      layout
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      className="flex w-72 shrink-0 snap-start flex-col gap-3 rounded-xl border border-border bg-canvas-soft p-4"
    >
      <Link
        href={profilePath(tip.from.handle)}
        className="group/by flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProfileAvatar avatar={tip.from.avatar} name={name} className="size-8" />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-body-sm font-semibold text-ink group-hover/by:text-primary-soft">{name}</span>
          <span className="flex items-center gap-1.5 text-caption text-mute">
            {!tip.seen && <span className="size-1.5 rounded-full bg-primary" aria-label="New" />}
            <span className="truncate">@{tip.from.handle}</span>
            <span aria-hidden>·</span>
            <time dateTime={tip.createdAt.toISOString()}>{timeAgo(tip.createdAt)}</time>
          </span>
        </span>
      </Link>

      {tip.note && <p className="line-clamp-3 text-body-md text-pretty text-ink">“{tip.note}”</p>}

      {tip.list ? (
        <Link
          href={tip.list.path}
          className="group/list flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="w-20 shrink-0">
            <Fan posters={tip.list.posters} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="line-clamp-2 text-body-sm font-semibold text-ink group-hover/list:text-primary-soft">{tip.list.name}</span>
            <span className="text-caption text-mute">
              <span className="font-mono tabular-nums">{tip.list.count}</span> {tip.list.count === 1 ? "film" : "films"}
            </span>
          </span>
        </Link>
      ) : (
        <ul className="flex gap-2" aria-label="Films sent">
          {tip.films.slice(0, POSTERS_SHOWN).map((f) => (
            <li key={f.tmdbId} className="w-[calc((100%-1.5rem)/4)]">
              <Link
                href={`/movie/${f.tmdbId}`}
                title={f.title}
                className="group/film block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Poster
                  path={f.posterPath}
                  title={f.title}
                  size="w185"
                  sizes="64px"
                  className={cn("transition-shadow group-hover/film:shadow-glow", known[f.tmdbId] && "opacity-60")}
                />
              </Link>
            </li>
          ))}
          {tip.films.length > POSTERS_SHOWN && (
            <li className="grid aspect-2/3 w-[calc((100%-1.5rem)/4)] place-items-center rounded-lg border border-border font-mono text-caption text-mute tabular-nums">
              +{tip.films.length - POSTERS_SHOWN}
            </li>
          )}
        </ul>
      )}
      {tip.films.length === 1 && (
        <p className="-mt-1 truncate text-caption text-body">
          {tip.films[0].title}
          {tip.films[0].year && <span className="font-mono text-mute"> · {tip.films[0].year}</span>}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        {tip.list ? (
          <Button size="lg" className="flex-1 px-3 text-body-sm font-semibold" render={<Link href={tip.list.path} />} nativeButton={false}>
            Open list
            <ArrowUpRightIcon />
          </Button>
        ) : allKnown ? (
          <p className="flex h-9 flex-1 items-center gap-1.5 text-body-sm text-body">
            <CheckIcon className="size-4 text-primary-soft" aria-hidden />
            Already in your films
          </p>
        ) : (
          <Button size="lg" className="flex-1 px-3 text-body-sm font-semibold" disabled={pending} onClick={save}>
            <BookmarkPlusIcon />
            {fresh.length > 1 ? `Save ${fresh.length} to watchlist` : "Save to watchlist"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-mute hover:text-ink"
          disabled={pending}
          onClick={dismiss}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <XIcon className="size-5" />
        </Button>
      </div>
    </motion.li>
  );
}
