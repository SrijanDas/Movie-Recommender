import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// The frame both list editor pages share: a heading, then the editor.
export function EditorPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-5 sm:px-6 md:pt-10 md:pb-6">
      <h1 className="text-display-md text-ink-strong md:text-display-lg">{title}</h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6" aria-hidden>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {children}
      </Suspense>
    </section>
  );
}

// A list's link lives under the username, so accounts without one pick it first.
export function NeedsHandle() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas-soft p-5">
      <p className="text-display-sm text-ink-strong">Pick a username first</p>
      <p className="text-body-sm text-body">Lists are shared from your profile link, so you need a username for it.</p>
      <Button className="self-start" render={<Link href="/account/edit" />} nativeButton={false}>
        Pick a username
      </Button>
    </div>
  );
}
