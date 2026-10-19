"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSiteHost } from "@/components/profile/handle-field";
import { Button } from "@/components/ui/button";
import { profilePath } from "@/lib/profile/rules";
import { cn } from "@/lib/utils";

// A site path as a full link (browser only).
export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}${path}`;
}

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: "Paste it in your bio, a story or a chat." });
    return true;
  } catch {
    toast.error("Couldn’t copy the link", { description: url });
    return false;
  }
}

// The phone's share sheet (Instagram, WhatsApp, Messages…) where there is
// one; otherwise copy the link.
export function ShareButton({
  path,
  title,
  text,
  className,
  variant = "default",
  label = "Share",
}: {
  path: string;
  title: string;
  text: string;
  className?: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  const share = async () => {
    const url = absoluteUrl(path);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Dismissing the sheet isn't a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(url);
  };
  return (
    <Button variant={variant} className={className} onClick={() => void share()}>
      <Share2Icon />
      {label}
    </Button>
  );
}

export function ShareProfileButton({
  handle,
  name,
  label = "Share profile",
  ...props
}: {
  handle: string;
  name: string;
  className?: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  return (
    <ShareButton
      path={profilePath(handle)}
      title={`${name} on Next Movie`}
      text="My favourite films, ranked."
      label={label}
      {...props}
    />
  );
}

// A link as text: tap it to copy.
export function CopyLink({ path, className }: { path: string; className?: string }) {
  const host = useSiteHost();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copy(absoluteUrl(path))) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }}
      className={cn(
        "group/link flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-canvas-soft px-3 text-left outline-none transition-colors hover:border-hairline-soft/40 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {/* On narrow screens the host gives way; the path always shows. */}
      <span className="flex min-w-0 flex-1 font-mono text-code">
        <span className="min-w-0 shrink-[100] truncate text-mute">{host}</span>
        <span className="min-w-0 truncate text-ink">{path}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-caption font-medium text-mute group-hover/link:text-ink">
        {copied ? <CheckIcon className="size-4 text-primary" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export function ProfileLink({ handle, className }: { handle: string; className?: string }) {
  return <CopyLink path={profilePath(handle)} className={className} />;
}
