import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/site/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">Save your picks</h1>
        <p className="text-body-md text-body">Sign in to save your films and feedback, and see them on any device.</p>
      </div>
      <div className="rounded-xl border border-border bg-muted p-5 sm:p-6">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </section>
  );
}
