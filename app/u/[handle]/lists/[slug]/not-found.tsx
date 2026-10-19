import Link from "next/link";
import { PlainHeader } from "@/components/site/header";
import { Button } from "@/components/ui/button";

export default function ListNotFound() {
  return (
    <>
      <PlainHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-display-md text-balance text-ink-strong">This list isn’t here</h1>
        <p className="text-body-md text-body">
          Its owner may have deleted it, or the link has a typo. Make your own lists from the films you love.
        </p>
        <Button className="self-start" render={<Link href="/sign-up" />} nativeButton={false}>
          Make yours
        </Button>
      </main>
    </>
  );
}
