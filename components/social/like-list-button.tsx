"use client";

import { motion } from "framer-motion";
import { HeartIcon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setListLiked } from "@/app/social/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CLASS = "h-10 gap-2 px-3 text-body-sm font-semibold";

// A heart and the list's likes. Members like with one tap (the heart fills
// at once); visitors are sent to sign in and come back here.
export function LikeListButton({
  listId,
  count,
  liked,
  viewer,
  path,
}: {
  listId: string;
  count: number;
  liked: boolean;
  viewer: "member" | "visitor";
  path: string;
}) {
  const [saved, setSaved] = useState({ liked, count });
  const [shown, setShown] = useOptimistic(saved, (_, next: { liked: boolean; count: number }) => next);
  const [, startTransition] = useTransition();

  if (viewer === "visitor") {
    return (
      <Button
        variant="outline"
        className={cn(CLASS, "text-body")}
        render={<Link href={`/sign-in?next=${encodeURIComponent(path)}`} />}
        nativeButton={false}
        title="Sign in to like this list"
      >
        <HeartIcon />
        <span className="font-mono tabular-nums">{count}</span>
        <span className="sr-only">{count === 1 ? "like" : "likes"}. Sign in to like this list.</span>
      </Button>
    );
  }

  const toggle = () =>
    startTransition(async () => {
      const next = { liked: !shown.liked, count: shown.count + (shown.liked ? -1 : 1) };
      setShown(next);
      const result = await setListLiked(listId, next.liked);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(next);
    });

  return (
    <Button
      variant="outline"
      className={cn(CLASS, shown.liked ? "border-primary-soft text-primary-soft" : "text-body")}
      aria-pressed={shown.liked}
      aria-label={shown.liked ? "Unlike this list" : "Like this list"}
      onClick={toggle}
    >
      {/* The heart pops as it fills. */}
      <motion.span key={String(shown.liked)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.45, duration: 0.35 }} className="flex">
        <HeartIcon className={cn(shown.liked && "fill-current")} />
      </motion.span>
      <span className="font-mono tabular-nums">{shown.count}</span>
      <span className="sr-only">{shown.count === 1 ? "like" : "likes"}</span>
    </Button>
  );
}
