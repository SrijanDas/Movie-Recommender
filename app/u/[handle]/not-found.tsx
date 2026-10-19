import Link from "next/link";
import { PlainHeader } from "@/components/site/header";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <>
      <PlainHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-display-md text-balance text-ink-strong">No one goes by that name</h1>
        <p className="text-body-md text-body">
          The link may have a typo, or they changed their username. Make your own page from the films you love.
        </p>
        <Button className="self-start" render={<Link href="/sign-up" />} nativeButton={false}>
          Make yours
        </Button>
      </main>
    </>
  );
}
