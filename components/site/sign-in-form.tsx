"use client";

import { EyeIcon, EyeOffIcon, Loader2Icon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { signInWithEmail, signInWithPassword, type SignInState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

// "link" emails a magic link; "sign-in" uses a password. New accounts are
// made on /sign-up (components/site/sign-up-form.tsx).
type Mode = "link" | "sign-in";
type FormState = SignInState & { mode?: Mode };

const SUBMIT: Record<Mode, string> = {
  link: "Email me a sign-in link",
  "sign-in": "Sign in",
};

async function submit(prev: FormState, formData: FormData): Promise<FormState> {
  const mode = formData.get("intent") as Mode;
  const result =
    mode === "link" ? await signInWithEmail(prev, formData) : await signInWithPassword(prev, formData);
  return { ...result, mode };
}

export function Sent({ title, email, body }: { title: string; email: string; body: string }) {
  return (
    <div className="flex flex-col gap-3" role="status">
      <MailCheckIcon className="size-6 text-primary" aria-hidden />
      <h2 className="text-display-sm text-ink">{title}</h2>
      <p className="text-body-md text-body">
        We sent a link to <span className="text-ink">{email}</span>. {body}
      </p>
    </div>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submit, { status: "idle" });
  const params = useSearchParams();
  const linkFailed = params.get("error") === "link";
  // Where the proxy sent us from, so sign-in can return there.
  const next = params.get("next");
  // Email and password by default; an expired email link opens on the link
  // form so its error shows next to "send a new one".
  const [mode, setMode] = useState<Mode>(linkFailed ? "link" : "sign-in");
  // Controlled so a failed attempt or a mode switch never clears what was typed.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (state.status === "sent") {
    return <Sent title="Check your inbox" email={state.message!} body="Open it on this device to sign in." />;
  }

  // Only show an error from the mode the user is looking at.
  const failed = state.status === "error" && state.mode === mode;
  const error = failed ? state.message : mode === "link" && linkFailed ? "That link expired or was already used. Send a new one." : null;
  const emailError = error && (!failed || state.field !== "password") ? error : null;
  const passwordError = failed && state.field === "password" ? error : null;
  const usesPassword = mode !== "link";

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="intent" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-body-sm text-body">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete={usesPassword ? "username" : "email"}
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className="h-11 bg-muted px-4 text-body-md"
        />
        {emailError && (
          <p id="email-error" role="alert" className="text-body-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      {usesPassword && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-body-sm text-body">
            Password
          </Label>
          <InputGroup className="h-11 bg-muted dark:bg-muted">
            <InputGroupInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              // Only after switching modes with an email already typed;
              // on first load the email field comes first.
              autoFocus={email !== ""}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-error" : undefined}
              className="h-full px-4 text-body-md"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {passwordError && (
            <p id="password-error" role="alert" className="text-body-sm text-destructive">
              {passwordError}
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {SUBMIT[mode]}
      </Button>

      {usesPassword ? (
        <div className="flex flex-col items-start gap-1">
          <p className="text-body-sm text-body">
            New here?
            <Button
              variant="ghostGreen"
              size="sm"
              className="h-8 px-1.5 text-body-sm"
              render={<Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} />}
              nativeButton={false}
            >
              Create an account
            </Button>
          </p>
          <Button
            type="button"
            variant="ghostGreen"
            size="sm"
            className="-ml-1.5 h-8 px-1.5 text-body-sm"
            onClick={() => setMode("link")}
          >
            Forgot it? Email me a link
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghostGreen"
          size="sm"
          className="-ml-1.5 h-8 self-start px-1.5 text-body-sm"
          onClick={() => setMode("sign-in")}
        >
          Use a password instead
        </Button>
      )}

    </form>
  );
}
