"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { MAX_NAME } from "@/lib/account-rules";
import { getCurrentUser } from "@/lib/auth";
import {
  AVATAR_BUCKET,
  MAX_AVATAR_BYTES,
  parseAvatar,
  serializeAvatar,
} from "@/lib/profile/avatar";
import { MAX_BIO, handleProblem, normalizeHandle, profilePath } from "@/lib/profile/rules";
import { getProfile, isHandleConflict, isHandleTaken, suggestHandle, updateProfile } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";

export type HandleCheck = { ok: true; handle: string } | { ok: false; error: string };

const TAKEN = "That username’s taken. Try another.";

// Is this handle free? Used while typing on /sign-up (signed out) and in the
// profile editor (where the user's own handle counts as free).
export async function checkHandle(value: unknown): Promise<HandleCheck> {
  if (typeof value !== "string") return { ok: false, error: "Pick a username." };
  const handle = normalizeHandle(value);
  const problem = handleProblem(handle);
  if (problem) return { ok: false, error: problem };
  const user = await getCurrentUser();
  return (await isHandleTaken(handle, user?.id)) ? { ok: false, error: TAKEN } : { ok: true, handle };
}

// A free handle made from a name, to prefill the username field.
export async function suggestHandleFor(name: unknown): Promise<string | null> {
  if (typeof name !== "string" || !name.trim() || name.length > MAX_NAME + 20) return null;
  const user = await getCurrentUser();
  return suggestHandle(name, user?.id).catch(() => null);
}

export type ProfileField = "name" | "handle" | "bio" | "avatar";
export type SaveProfileResult = { ok: true; path: string } | { ok: false; error: string; field?: ProfileField };

const fail = (error: string, field?: ProfileField): SaveProfileResult => ({ ok: false, error, field });

// Save the profile editor. `avatar` is the chosen avatar (see
// lib/profile/avatar.ts), "" for initials, or "photo" with the cropped
// image in `photo`.
export async function saveProfile(formData: FormData): Promise<SaveProfileResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session ended. Sign in again.");

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name) return fail("Enter your name.", "name");
  if (name.length > MAX_NAME) return fail(`Keep it under ${MAX_NAME} characters.`, "name");

  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  const problem = handleProblem(handle);
  if (problem) return fail(problem, "handle");
  if (await isHandleTaken(handle, user.id)) return fail(TAKEN, "handle");

  const bio = String(formData.get("bio") ?? "").trim().replace(/\s+/g, " ");
  if (bio.length > MAX_BIO) return fail(`Keep it to ${MAX_BIO} characters.`, "bio");

  const current = await getProfile(user.id);
  const previous = parseAvatar(current?.avatar);
  const choice = String(formData.get("avatar") ?? "");
  const supabase = await createClient();

  let avatar: string | null;
  if (choice === "photo") {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return fail("Choose a photo.", "avatar");
    if (photo.size > MAX_AVATAR_BYTES) return fail("That photo is too big. Try another.", "avatar");
    if (!["image/jpeg", "image/webp", "image/png"].includes(photo.type)) {
      return fail("Use a JPEG, PNG or WebP photo.", "avatar");
    }
    // A new name per upload, so caches never show the old picture. The
    // Storage policies only let a user write under their own folder.
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `avatars/${user.id}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, photo, { contentType: photo.type, cacheControl: "31536000" });
    if (error) {
      console.error(error);
      return fail("We couldn’t upload that photo. Try again.", "avatar");
    }
    avatar = serializeAvatar({ kind: "upload", path });
  } else if (choice === "keep") {
    avatar = current?.avatar ?? null;
  } else {
    // A poster or icon, or "" for initials. Anything unrecognised is initials.
    avatar = serializeAvatar(parseAvatar(choice));
  }

  try {
    await updateProfile(user.id, { handle, displayName: name, bio: bio || null, avatar });
  } catch (error) {
    if (isHandleConflict(error)) return fail(TAKEN, "handle");
    console.error(error);
    return fail("We couldn’t save your profile. Try again.");
  }

  // The old photo is no longer shown anywhere.
  if (previous?.kind === "upload" && serializeAvatar(previous) !== avatar) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous.path]).catch(() => null);
  }
  // Keep the auth display name (header initials) in step.
  if (name !== user.name) {
    await supabase.auth.updateUser({ data: { full_name: name } }).catch(() => null);
  }

  revalidatePath("/", "layout");
  return { ok: true, path: profilePath(handle) };
}
