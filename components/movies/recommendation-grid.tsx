import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Shared by the signed-in (server) and guest (client) recommendation views.
// The interactive grid itself is RecommendationList.

export const GRID = "grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5";

export function RecommendationSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-mute" role="status">
        Reading your picks and searching thousands of films…
      </p>
      <ul className={GRID} aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-2/3 rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-6 w-1/2 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-muted p-5 sm:p-8">
      <h2 className="text-display-sm text-ink">{title}</h2>
      <p className="max-w-prose text-body-md text-body">{body}</p>
      {action}
    </div>
  );
}

export function NeedMoreNotice({ loved, min }: { loved: number; min: number }) {
  return (
    <Notice
      title={loved === 0 ? "Start with films you love" : `Pick ${min - loved} more`}
      body={`Recommendations come from the films you love. Pick at least ${min} and we’ll take it from there.`}
      action={
        <Button render={<Link href="/" />} nativeButton={false}>
          Pick films
        </Button>
      }
    />
  );
}

export function RanOutNotice() {
  return (
    <Notice
      title="We ran out of ideas"
      body="You’ve rated everything we could find for this taste profile. Add a few more films you like to widen the search."
      action={
        <Button variant="outline" render={<Link href="/my-movies" />} nativeButton={false}>
          Add films you like
        </Button>
      }
    />
  );
}
