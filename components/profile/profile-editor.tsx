"use client";

import { CameraIcon, CheckIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfile, type ProfileField } from "@/app/profile/actions";
import { AvatarPicker, type AvatarChoice } from "@/components/profile/avatar-picker";
import { HandleField, handleReady, useHandleCheck } from "@/components/profile/handle-field";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_NAME } from "@/lib/account-rules";
import { MAX_BIO, normalizeHandle } from "@/lib/profile/rules";
import { cn } from "@/lib/utils";

type Saved = { name: string; handle: string | null; bio: string; avatar: string};
type Draft = { name: string; handle: string; bio: string; avatar: AvatarChoice | null};

// Edit name, username, bio and picture. Nothing saves until Save, and the
// username must be checked free first.
export function ProfileEditor({
  saved,
  suggestedHandle,
}: {
  saved: Saved;
  // Prefills the username for accounts that don't have one yet.
  suggestedHandle: string | null;
}) {
  const router = useRouter();
  const initial: Draft = { name: saved.name, handle: saved.handle ?? suggestedHandle ?? "", bio: saved.bio, avatar: null };
  const [draft, setDraft] = useState<Draft | null>(null);
  const d = draft ?? initial;
  const set = (patch: Partial<Draft>) => setDraft({ ...d, ...patch });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [serverError, setServerError] = useState<{ field?: ProfileField; message: string } | null>(null);
  const handleStatus = useHandleCheck(d.handle, saved.handle);

  // The page stays mounted (hidden) after leaving; start fresh next time.
  useLayoutEffect(() => () => setDraft(null), []);

  // Object URLs for picked photos are freed once replaced.
  const previewUrl = d.avatar?.kind === "photo" ? d.avatar.previewUrl : null;
  useEffect(() => (previewUrl ? () => URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);

  const avatarValue = d.avatar?.kind === "value" ? d.avatar.value : saved.avatar;
  const dirty =
    d.name.trim() !== saved.name ||
    normalizeHandle(d.handle) !== (saved.handle ?? "") ||
    d.bio.trim() !== saved.bio ||
    (d.avatar !== null && (d.avatar.kind === "photo" || d.avatar.value !== saved.avatar));
  const canSave = dirty && d.name.trim() !== "" && handleReady(handleStatus) && !saving;

  const errorFor = (field: ProfileField) => (serverError?.field === field ? serverError.message : null);

  const save = () => {
    const form = new FormData();
    form.set("name", d.name);
    form.set("handle", d.handle);
    form.set("bio", d.bio);
    if (d.avatar?.kind === "photo") {
      form.set("avatar", "photo");
      form.set("photo", new File([d.avatar.blob], "avatar.jpg", { type: "image/jpeg" }));
    } else {
      form.set("avatar", d.avatar ? d.avatar.value : "keep");
    }
    startSaving(async () => {
      const result = await saveProfile(form).catch(() => null);
      if (!result) {
        setServerError({ message: "We couldn’t save your profile. Check your connection and try again." });
        return;
      }
      if (!result.ok) {
        setServerError({ field: result.field, message: result.error });
        return;
      }
      setServerError(null);
      toast.success("Profile saved", {
        action: { label: "View", onClick: () => router.push(result.path) },
      });
      router.push("/account");
    });
  };

  return (
    <form
      className="flex flex-1 flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) save();
      }}
      noValidate
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="group/pic relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Change picture"
        >
          {previewUrl ? (
            <Avatar className="size-28">
              <AvatarImage src={previewUrl} alt="" />
            </Avatar>
          ) : (
            <ProfileAvatar avatar={avatarValue || null} name={d.name || saved.name} className="size-28" />
          )}
          <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground transition-transform duration-150 ease-out group-hover/pic:scale-105 group-active/pic:scale-95">
            <CameraIcon className="size-4" aria-hidden />
          </span>
        </button>
        <Button type="button" variant="ghostGreen" size="sm" className="h-9 px-3 text-body-sm" onClick={() => setPickerOpen(true)}>
          Change picture
        </Button>
        {errorFor("avatar") && (
          <p role="alert" className="text-body-sm text-destructive">
            {errorFor("avatar")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <Field id="name" label="Name" error={errorFor("name")}>
          <Input
            id="name"
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={MAX_NAME}
            aria-invalid={errorFor("name") ? true : undefined}
            className="h-12 bg-muted px-4 text-body-md md:text-body-md"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <label id="handle-label" htmlFor="handle" className="text-body-sm font-semibold text-ink">
            Username
          </label>
          <HandleField
            id="handle"
            value={d.handle}
            onChange={(handle) => {
              set({ handle });
              if (serverError?.field === "handle") setServerError(null);
            }}
            status={handleStatus}
            serverError={errorFor("handle")}
            aria-labelledby="handle-label"
            className="h-12"
            inputClassName="h-full text-body-md md:text-body-md"
          />
        </div>

        <Field
          id="bio"
          label="Bio"
          hint={`${d.bio.length}/${MAX_BIO}`}
          error={errorFor("bio")}
        >
          <Textarea
            id="bio"
            value={d.bio}
            onChange={(e) => set({ bio: e.target.value.replace(/\n/g, " ") })}
            maxLength={MAX_BIO}
            rows={2}
            placeholder="Slow cinema, 90s Hong Kong, anything with Tilda Swinton"
            aria-invalid={errorFor("bio") ? true : undefined}
            className="min-h-20 bg-muted px-4 py-3 text-body-md md:text-body-md"
          />
        </Field>
      </div>

      {serverError && !serverError.field && (
        <p role="alert" className="text-body-sm text-destructive">
          {serverError.message}
        </p>
      )}

      {/* Sticky action bar: in thumb reach above the tab bar on phones. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-body-sm text-mute" aria-live="polite">
            {dirty ? "Not saved yet." : "No changes yet."}
          </p>
          <Button
            variant="ghost"
            size="lg"
            className="px-3 text-body-sm text-body"
            render={<Link href="/account" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" size="lg" className="px-4 text-body-sm font-semibold" disabled={!canSave}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            Save
          </Button>
        </div>
      </div>

      <AvatarPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        current={d.avatar?.kind === "photo" ? "photo" : avatarValue}
        onChoose={(avatar) => set({ avatar })}
      />
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-body-sm font-semibold text-ink">
          {label}
        </label>
        {hint && <span className="font-mono text-code text-mute tabular-nums">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className={cn("text-body-sm text-destructive")}>
          {error}
        </p>
      )}
    </div>
  );
}
