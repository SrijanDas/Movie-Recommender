"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  // "sent": magic link emailed. "confirm": account created, confirmation emailed.
  status: "idle" | "sent" | "confirm" | "error";
  message?: string;
  field?: "email" | "password";
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function readEmail(formData: FormData): string | null {
  const email = String(formData.get("email") ?? "").trim();
  return EMAIL.test(email) && email.length <= 254 ? email : null;
}

async function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";
}

const INVALID_EMAIL: SignInState = { status: "error", field: "email", message: "Enter a valid email address." };

// Email a magic link. The link lands on /auth/confirm, which signs the user
// in and merges their anonymous list into the account.
export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  if (!email) return INVALID_EMAIL;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/recommendations` },
  });
  if (error) {
    console.error(error);
    return { status: "error", message: "We couldn't send the link. Try again in a minute." };
  }
  return { status: "sent", message: email };
}

// Sign in with a password, or create an account when intent is "sign-up".
// The guest list is imported client-side by <ImportLocalList> after redirect.
export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  if (!email) return INVALID_EMAIL;
  const password = String(formData.get("password") ?? "");
  const signUp = formData.get("intent") === "sign-up";
  if (!password) return { status: "error", field: "password", message: "Enter your password." };
  if (signUp && password.length < MIN_PASSWORD) {
    return { status: "error", field: "password", message: `Use at least ${MIN_PASSWORD} characters.` };
  }

  const supabase = await createClient();
  if (signUp) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/recommendations` },
    });
    if (error) {
      if (error.code === "weak_password") {
        return { status: "error", field: "password", message: "Pick a stronger password: longer, and not a common one." };
      }
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return { status: "error", field: "email", message: "That email already has an account. Sign in instead." };
      }
      console.error(error);
      return { status: "error", message: "We couldn't create your account. Try again in a minute." };
    }
    // With email confirmation on there is no session yet. Supabase also lands
    // here for an existing email, so the message stays neutral.
    if (!data.session) return { status: "confirm", message: email };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "invalid_credentials") {
        return {
          status: "error",
          field: "password",
          message: "Wrong email or password. Never set one? Use an email link instead.",
        };
      }
      if (error.code === "email_not_confirmed") {
        return { status: "error", field: "email", message: "Confirm your email first. Check your inbox for the link." };
      }
      console.error(error);
      return { status: "error", message: "We couldn't sign you in. Try again in a minute." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/recommendations");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
