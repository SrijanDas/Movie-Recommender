"use client";

import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signInWithEmail, type SignInState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInWithEmail, { status: "idle" });
  const linkFailed = useSearchParams().get("error") === "link";

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <MailCheckIcon className="size-6 text-primary" aria-hidden />
        <h2 className="text-display-sm text-ink">Check your inbox</h2>
        <p className="text-body-md text-body">
          We sent a sign-in link to <span className="text-ink">{state.message}</span>. Open it on this device to keep
          the films you’ve picked so far.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : linkFailed ? "That link expired or was already used. Send a new one." : null;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-body-sm text-body">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          className="h-11 bg-muted px-4 text-body-md"
        />
        {error && (
          <p id="email-error" className="text-body-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        Email me a sign-in link
      </Button>
      <p className="text-caption text-mute">No password. Films you picked before signing in move to your account.</p>
    </form>
  );
}
