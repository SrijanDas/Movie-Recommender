"use client";

import { CheckIcon, DicesIcon, ImageUpIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AVATAR_PX,
  MAX_AVATAR_BYTES,
  generatedAvatarUrl,
  randomSeed,
  serializeAvatar,
} from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

export type AvatarChoice =
  | { kind: "photo"; blob: Blob; previewUrl: string }
  // A stored avatar string (a generated one), or "" for initials.
  | { kind: "value"; value: string };

// Three rows to start; "More avatars" adds two rows at a time.
const SUGGESTIONS = 15;
const MORE = 10;
const MAX_SUGGESTIONS = 60;

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

// Choose a picture: upload a photo, take one of the generated avatars (more on
// request), or roll a random one. Choosing closes the sheet; nothing saves
// until Save.
export function AvatarPicker({
  open,
  onOpenChange,
  current,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The stored avatar string currently shown, to mark it selected.
  current: string;
  onChoose: (choice: AvatarChoice) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeds, setSeeds] = useState(() => Array.from({ length: SUGGESTIONS }, randomSeed));
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
      <DialogContent className="flex flex-col gap-6 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-display-sm">Choose your picture</DialogTitle>
          <DialogDescription>Upload a photo, or pick an avatar.</DialogDescription>
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

        <fieldset className="flex flex-col">
          <legend className="mb-3 text-body-sm font-semibold text-ink">Or pick an avatar</legend>
          <div className="-m-1 grid max-h-[min(42svh,22rem)] grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1">
            {seeds.map((seed, i) => {
              const value = serializeAvatar({ kind: "gen", seed })!;
              const selected = current === value;
              return (
                <button
                  key={seed}
                  type="button"
                  aria-label={`Avatar ${i + 1}`}
                  aria-pressed={selected}
                  onClick={() => choose({ kind: "value", value })}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-full border border-border bg-canvas-soft outline-none transition-[box-shadow,transform] duration-150 ease-out hover:scale-[1.04] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
                    selected && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote SVG, already sized */}
                  <img src={generatedAvatarUrl(seed)} alt="" className="size-full" />
                  {selected && (
                    <span className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            {seeds.length < MAX_SUGGESTIONS && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSeeds((s) => [...s, ...Array.from({ length: MORE }, randomSeed)])}
              >
                <PlusIcon />
                More avatars
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => choose({ kind: "value", value: serializeAvatar({ kind: "gen", seed: randomSeed() })! })}
            >
              <DicesIcon />
              Random
            </Button>
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
