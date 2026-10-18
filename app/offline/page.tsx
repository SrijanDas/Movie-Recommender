import type { Metadata } from "next";
import { WifiOffIcon } from "lucide-react";
import { LogoMark } from "@/components/site/logo";

export const metadata: Metadata = { title: "You’re offline" };

// Served by public/sw.js when a page can't load without a connection.
// Static: no session, no data, so it can be cached at install time.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <LogoMark className="size-12" />
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center justify-center gap-2 text-display-md text-ink-strong">
          <WifiOffIcon className="size-6 text-mute" aria-hidden />
          You’re offline
        </h1>
        <p className="text-body-md text-body">Next Movie needs a connection to find your next film. Reconnect and try again.</p>
      </div>
      {/* A plain link reloads the page, which is what we want once back online. */}
      <a
        href="/recommendations"
        className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-body-md font-semibold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Try again
      </a>
    </main>
  );
}
