"use client";

import { AtSignIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { checkHandle } from "@/app/profile/actions";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { handleProblem, MAX_HANDLE, normalizeHandle } from "@/lib/profile/rules";
import { cn } from "@/lib/utils";

export type HandleStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unchanged" }
  | { state: "error"; message: string };

// The site's host for "nextmovie.app/@you" previews: NEXT_PUBLIC_SITE_URL
// when set, else wherever the page is open.
const ENV_HOST = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
const noop = () => () => {};
export function useSiteHost() {
  return useSyncExternalStore(noop, () => ENV_HOST ?? window.location.host, () => ENV_HOST ?? "");
}

// Checks a handle as the user types: format rules at once, availability on
// the server after a short pause. `initial` (the user's own handle) counts
// as available without asking.
export function useHandleCheck(value: string, initial?: string | null): HandleStatus {
  const handle = normalizeHandle(value);
  const problem = handle ? handleProblem(handle) : null;
  const local: HandleStatus | null = !handle
    ? { state: "idle" }
    : problem
      ? { state: "error", message: problem }
      : handle === initial
        ? { state: "unchanged" }
        : null;

  const [remote, setRemote] = useState<{ handle: string; status: HandleStatus } | null>(null);
  const latest = useRef(handle);
  useEffect(() => {
    latest.current = handle;
    if (local) return;
    const timer = setTimeout(async () => {
      const result = await checkHandle(handle).catch(() => null);
      if (latest.current !== handle) return;
      setRemote({
        handle,
        status: !result
          ? { state: "error", message: "We couldn’t check that. Try again." }
          : result.ok
            ? { state: "available" }
            : { state: "error", message: result.error },
      });
    }, 350);
    return () => clearTimeout(timer);
    // `local` is derived from `handle` and `initial`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, initial]);

  if (local) return local;
  return remote?.handle === handle ? remote.status : { state: "checking" };
}

// "@" + the username, with its availability beside and beneath it.
export function HandleField({
  id,
  value,
  onChange,
  status,
  serverError,
  className,
  inputClassName,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  status: HandleStatus;
  serverError?: string | null;
  className?: string;
  inputClassName?: string;
} & Pick<React.ComponentProps<"input">, "autoFocus" | "enterKeyHint" | "name" | "aria-labelledby">) {
  const host = useSiteHost();
  const handle = normalizeHandle(value);
  const error = serverError ?? (status.state === "error" ? status.message : null);
  const ok = !serverError && (status.state === "available" || status.state === "unchanged");

  return (
    <div className="flex flex-col gap-2">
      <InputGroup className={cn("bg-muted dark:bg-muted", className)}>
        <InputGroupAddon align="inline-start" className="pl-4 text-mute">
          <AtSignIcon className="size-4" aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          {...rest}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, "").toLowerCase())}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAX_HANDLE + 1}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-status`}
          className={cn("pl-1.5", inputClassName)}
        />
        <InputGroupAddon align="inline-end" className="pr-4" aria-hidden>
          {status.state === "checking" && <Loader2Icon className="size-4 animate-spin text-mute" />}
          {ok && <CheckIcon className="size-4 text-primary" />}
          {error && <XIcon className="size-4 text-destructive" />}
        </InputGroupAddon>
      </InputGroup>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn("min-h-5 text-body-sm", error ? "text-destructive" : "text-mute")}
      >
        {error ??
          (handle ? (
            <>
              <span className="text-body">
                {host}/@{handle}
              </span>
              {status.state === "available" && <span className="text-primary"> is free</span>}
              {status.state === "checking" && " · checking…"}
            </>
          ) : (
            "Letters, numbers, “_” and “.”"
          ))}
      </p>
    </div>
  );
}

// Whether a status lets the form go on.
export const handleReady = (status: HandleStatus) => status.state === "available" || status.state === "unchanged";
