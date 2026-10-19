import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fixed to the bottom of public pages for anyone who isn't the owner.
// Visitors: what this is and one way in. Members: back to their picks.
export function JoinBar({ viewer, title }: { viewer: "member" | "visitor"; title?: string }) {
  const visitor = viewer === "visitor";
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-canvas pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-body-sm font-semibold text-ink">
            {title ?? (visitor ? "Get picks like this" : "Find your next film")}
          </p>
          <p className="truncate text-caption text-mute">
            {visitor ? "Tap films you love. We say why." : "Your picks are waiting."}
          </p>
        </div>
        <Button
          className="shrink-0"
          render={<Link href={visitor ? "/sign-up" : "/recommendations"} />}
          nativeButton={false}
        >
          {visitor ? "Make yours" : "Open"}
        </Button>
      </div>
    </div>
  );
}
