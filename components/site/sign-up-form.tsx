"use client";

import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { signUp, type SignUpState } from "@/app/auth/actions";
import { Sent } from "@/components/site/sign-in-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { EMAIL, MAX_NAME, MIN_PASSWORD } from "@/lib/account-rules";
import { cn } from "@/lib/utils";

// Create an account one field at a time (name → email → password), so each
// screen has one question, one keyboard and one button on a phone. Every
// value is kept as the user moves back and forth; only the last step submits.

type Field = "name" | "email" | "password";
const STEPS: Field[] = ["name", "email", "password"];

function check(field: Field, value: string): string | null {
  if (field === "name") {
    const name = value.trim();
    if (!name) return "Enter your name.";
    if (name.length > MAX_NAME) return `Keep it under ${MAX_NAME} characters.`;
  }
  if (field === "email" && !EMAIL.test(value.trim())) return "Enter a valid email address.";
  if (field === "password" && value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  return null;
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, { status: "idle" });
  const next = useSearchParams().get("next");
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [step, setStep] = useState(0);
  // Which way the last move went, for the slide direction.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [clientError, setClientError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // A server error stays until the user edits the field it's about.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);

  // A server error about an earlier field (e.g. the email already has an
  // account) takes the user back to that step.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    setEditedSinceSubmit(false);
    if (state.status === "error" && state.field && STEPS.indexOf(state.field) !== step) {
      setDirection(-1);
      setStep(STEPS.indexOf(state.field));
    }
  }

  if (state.status === "confirm") {
    return (
      <Sent
        title="Confirm your email"
        email={state.message!}
        body="Open it on this device to finish creating your account."
      />
    );
  }

  const field = STEPS[step];
  const last = step === STEPS.length - 1;
  const serverError =
    state.status === "error" && !editedSinceSubmit && (state.field ? state.field === field : last) ? state.message : null;
  const error = clientError ?? serverError;
  const firstName = values.name.trim().split(" ")[0];

  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setClientError(null);
    setStep(to);
  };

  const update = (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setClientError(null);
    setEditedSinceSubmit(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const problem = check(field, values[field]);
    if (problem) {
      e.preventDefault();
      setClientError(problem);
    } else if (!last) {
      e.preventDefault();
      go(step + 1);
    }
    // Last step and valid: the form action runs.
  };

  const copy: Record<Field, { title: string; hint: string }> = {
    name: { title: "What’s your name?", hint: "So we know what to call you." },
    email: {
      title: firstName ? `Nice to meet you, ${firstName}. What’s your email?` : "What’s your email?",
      hint: "You’ll use it to sign in.",
    },
    password: { title: "Last step: pick a password", hint: `At least ${MIN_PASSWORD} characters.` },
  };

  const inputProps = {
    id: field,
    name: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(e.target.value),
    autoFocus: true,
    required: true,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${field}-error` : `${field}-hint`,
  };

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {/* Earlier answers ride along with the final submit. The email stays a
          real (visually hidden) field so password managers pair it with the
          new password. */}
      {field !== "name" && <input type="hidden" name="name" value={values.name} />}
      {field === "password" && (
        <input
          type="email"
          name="email"
          value={values.email}
          autoComplete="username"
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      )}

      <div className="flex h-9 items-center justify-between gap-4">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="-ml-2 h-9 gap-1.5 px-2 text-body-sm text-body" onClick={() => go(step - 1)}>
            <ArrowLeftIcon />
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="font-mono text-code text-mute tabular-nums" aria-live="polite">
            {step + 1} of {STEPS.length}
          </span>
          <ol className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={cn("h-1 w-6 rounded-full transition-colors duration-300", i <= step ? "bg-primary" : "bg-border")}
              />
            ))}
          </ol>
        </div>
      </div>

      <div
        key={field}
        className={cn(
          "flex flex-col gap-5 duration-300 ease-out animate-in fade-in motion-reduce:animate-none",
          direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6",
        )}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={field} className="text-display-md text-balance text-ink-strong">
            {copy[field].title}
          </label>
          <p id={`${field}-hint`} className="text-body-md text-body">
            {copy[field].hint}
          </p>
        </div>

        {field === "name" && (
          <Input
            {...inputProps}
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={MAX_NAME + 20}
            placeholder="Your name"
            className="h-14 bg-muted px-4 text-body-lg md:text-body-lg"
          />
        )}
        {field === "email" && (
          <Input
            {...inputProps}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@example.com"
            className="h-14 bg-muted px-4 text-body-lg md:text-body-lg"
          />
        )}
        {field === "password" && (
          <InputGroup className="h-14 bg-muted dark:bg-muted">
            <InputGroupInput
              {...inputProps}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              enterKeyHint="done"
              minLength={MIN_PASSWORD}
              className="h-full px-4 text-body-lg md:text-body-lg"
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
        )}

        {error && (
          <p id={`${field}-error`} role="alert" className="-mt-2 text-body-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="h-12 text-body-md">
          {pending && <Loader2Icon className="animate-spin" />}
          {last ? "Create account" : "Continue"}
        </Button>
      </div>

      <p className="text-body-sm text-body">
        Already have an account?
        <Button
          variant="ghostGreen"
          size="sm"
          className="h-8 px-1.5 text-body-sm"
          render={<Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"} />}
          nativeButton={false}
        >
          Sign in
        </Button>
      </p>
    </form>
  );
}
