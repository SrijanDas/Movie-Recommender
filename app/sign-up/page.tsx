import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlainHeader } from "@/components/site/header";
import { SignUpForm } from "@/components/site/sign-up-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <PlainHeader>
        <Button variant="ghost" size="sm" className="h-9 text-body-sm text-body" render={<Link href="/sign-in" />} nativeButton={false}>
          Sign in
        </Button>
      </PlainHeader>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-12">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </main>
    </>
  );
}
