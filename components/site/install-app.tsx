"use client";

import { CheckIcon, DownloadIcon, ShareIcon, SquarePlusIcon } from "lucide-react";
import { promptInstall, useInstallState } from "@/components/site/pwa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Add Next Movie to the home screen: a real button where the browser allows
// it (Chrome, Edge, Android), instructions where it doesn't (iOS Safari).
export function InstallApp() {
  const state = useInstallState();

  if (state === "unknown") return <Skeleton className="h-11 w-full" />;
  if (state === "installed") {
    return (
      <p className="flex items-center gap-2 text-body-sm text-body">
        <CheckIcon className="size-4 text-primary" aria-hidden />
        You’re using the installed app.
      </p>
    );
  }
  if (state === "prompt") {
    return (
      <Button className="h-11 w-full sm:w-auto" onClick={() => void promptInstall()}>
        <DownloadIcon />
        Install Next Movie
      </Button>
    );
  }
  if (state === "ios") {
    return (
      <ol className="flex flex-col gap-2 text-body-sm text-body">
        <li className="flex items-center gap-2">
          <span className="font-mono text-code text-mute">1</span>
          Tap <ShareIcon className="size-4 text-ink" aria-label="Share" /> in Safari’s toolbar
        </li>
        <li className="flex items-center gap-2">
          <span className="font-mono text-code text-mute">2</span>
          Choose <SquarePlusIcon className="size-4 text-ink" aria-hidden />
          <span className="text-ink">Add to Home Screen</span>
        </li>
      </ol>
    );
  }
  return (
    <p className="text-body-sm text-body">
      Open your browser’s menu and choose <span className="text-ink">Install app</span> or{" "}
      <span className="text-ink">Add to Home screen</span>.
    </p>
  );
}
