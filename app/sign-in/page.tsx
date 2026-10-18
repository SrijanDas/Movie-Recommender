import type { Metadata } from "next";
import { Suspense } from "react";
import { PlainHeader, TmdbAttribution } from "@/components/site/header";
import { SignInForm } from "@/components/site/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <PlainHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md text-ink-strong md:text-display-lg">Welcome back</h1>
          <p className="text-body-md text-body">Sign in to Next Movie with your email and password.</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-5 sm:p-6">
          <Suspense>
            <SignInForm />
          </Suspense>
        </div>
        <TmdbAttribution className="mt-auto text-caption text-mute" />
      </main>
    </>
  );
}
