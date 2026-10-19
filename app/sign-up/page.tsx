import type { Metadata } from "next";
import { Suspense } from "react";
import { PlainHeader, SignedOutNav } from "@/components/site/header";
import { SignUpForm } from "@/components/site/sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <PlainHeader>
        <SignedOutNav />
      </PlainHeader>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-12">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </main>
    </>
  );
}
