"use client";

import { CheckIcon, ImageUpIcon, Loader2Icon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { AVATAR_ICON_COMPONENTS } from "@/components/profile/avatar-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVATAR_ICONS, AVATAR_PX, MAX_AVATAR_BYTES, serializeAvatar } from "@/lib/profile/avatar";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

export type PosterOption = { tmdbId: number; title: string; posterPath: string };

export type AvatarChoice =
  | { kind: "photo"; blob: Blob; previewUrl: string }
  // A stored avatar string (poster or icon), or "" for initials.
  | { kind: "value"; value: string };

// Center-crop to a square and re-encode as JPEG, so uploads are small and
// every photo renders the same everywhere (including the share image).
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(AVATAR_PX, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob || blob.size > MAX_AVATAR_BYTES) throw new Error("Couldn’t shrink the photo");
  return blob;
}

// Choose a picture: upload a photo, wear a favourite's poster, or pick a
// cinema icon. Choosing closes the sheet; nothing saves until Save.
export function AvatarPicker({
  open,
  onOpenChange,
  current,
  posters,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The stored avatar string currently shown, to mark it selected.
  current: string;
  posters: PosterOption[];
  onChoose: (choice: AvatarChoice) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (choice: AvatarChoice) => {
    setError(null);
    onChoose(choice);
    onOpenChange(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await squarePhoto(file);
      choose({ kind: "photo", blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setError("That photo didn’t work. Try a JPEG or PNG.");
    } finally {
      setProcessing(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-6 overflow-x-hidden overflow-y-auto p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-display-sm">Choose your picture</DialogTitle>
          <DialogDescription>A photo, a poster you love, or an icon.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button className="h-12 w-full" disabled={processing} onClick={() => input.current?.click()}>
            {processing ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
            Upload a photo
          </Button>
          {error && (
            <p role="alert" className="text-body-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {posters.length > 0 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-body-sm font-semibold text-ink">From your favourites</legend>
            <div className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
              {posters.map((p) => {
                const value = serializeAvatar({ kind: "poster", path: p.posterPath })!;
                return (
                  <Option key={p.tmdbId} label={p.title} selected={current === value} onClick={() => choose({ kind: "value", value })}>
                    <Image
                      src={posterUrl(p.posterPath, "w185")!}
                      alt=""
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover object-[50%_18%]"
                    />
                  </Option>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-body-sm font-semibold text-ink">Icons</legend>
          <div className="grid grid-cols-4 justify-items-center gap-3 py-1 sm:grid-cols-6">
            {AVATAR_ICONS.map((icon) => {
              const Icon = AVATAR_ICON_COMPONENTS[icon];
              const value = serializeAvatar({ kind: "icon", icon })!;
              return (
                <Option key={icon} label={icon} selected={current === value} onClick={() => choose({ kind: "value", value })}>
                  <Icon className="size-7 text-ink" strokeWidth={1.5} aria-hidden />
                </Option>
              );
            })}
          </div>
        </fieldset>

        {current !== "" && (
          <Button variant="ghost" className="self-start text-body-sm text-body" onClick={() => choose({ kind: "value", value: "" })}>
            Use my initials instead
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Option({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex size-16 shrink-0 snap-start items-center justify-center overflow-hidden rounded-full border border-border bg-canvas-soft outline-none transition-[box-shadow,border-color] duration-150 hover:border-hairline-soft/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary ring-2 ring-primary ring-offset-2 ring-offset-popover",
      )}
    >
      {children}
      {selected && (
        <span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}
    </button>
  );
}
