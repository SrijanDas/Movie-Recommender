"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EMAIL, MAX_NAME, MIN_PASSWORD } from "@/lib/account-rules";
import { safeNext } from "@/lib/auth";
import { homeFor } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  // "sent": magic link emailed.
  status: "idle" | "sent" | "error";
  message?: string;
  field?: "email" | "password";
};

function readEmail(formData: FormData): string | null {
  const email = String(formData.get("email") ?? "").trim();
  return EMAIL.test(email) && email.length <= 254 ? email : null;
}

async function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";
}

// The magic-link landing URL, carrying the page the user was sent from.
async function confirmUrl(formData: FormData) {
  const next = safeNext(formData.get("next"));
  return `${await siteOrigin()}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`;
}

const INVALID_EMAIL: SignInState = { status: "error", field: "email", message: "Enter a valid email address." };

// Email a magic link to an existing account; it lands on /auth/confirm,
// which signs the user in. New accounts come from /sign-up, with a name.
export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  if (!email) return INVALID_EMAIL;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await confirmUrl(formData), shouldCreateUser: false },
  });
  if (error) {
    // Supabase's answer when the email has no account and sign-ups are off.
    if (error.code === "otp_disabled") {
      return { status: "error", field: "email", message: "No account uses that email. Create one instead." };
    }
    console.error(error);
    return { status: "error", message: "We couldn't send the link. Try again in a minute." };
  }
  return { status: "sent", message: email };
}

// Sign in with a password. Users who haven't onboarded go there first;
// everyone else returns to where they were headed.
export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = readEmail(formData);
  if (!email) return INVALID_EMAIL;
  const password = String(formData.get("password") ?? "");
  if (!password) return { status: "error", field: "password", message: "Enter your password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  const home = await homeFor(data.user.id);
  revalidatePath("/", "layout");
  redirect(home === "/onboarding" ? home : (safeNext(formData.get("next")) ?? home));
}

export type SignUpState = {
  // "confirm": account created, confirmation emailed.
  status: "idle" | "confirm" | "error";
  message?: string;
  field?: "name" | "email" | "password";
};

// Create an account (the /sign-up steps). The name is display-only and lives
// in Supabase user_metadata, never used for authorization. New accounts go
// to onboarding.
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { status: "error", field: "name", message: "Enter your name." };
  if (name.length > MAX_NAME) return { status: "error", field: "name", message: `Keep it under ${MAX_NAME} characters.` };
  const email = readEmail(formData);
  if (!email) return { ...INVALID_EMAIL, status: "error" };
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { status: "error", field: "password", message: `Use at least ${MIN_PASSWORD} characters.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: await confirmUrl(formData) },
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

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
