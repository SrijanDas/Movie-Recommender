import { ArrowUpRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { PlainHeader } from "@/components/site/header";

export const metadata: Metadata = { title: "Credits" };

// The one place the app names the services it's built on. Their terms ask for
// attribution; nowhere else in the app repeats it (see CLAUDE.md). Public, so
// anyone checking the attribution can reach it without an account.
const CREDITS = [
  {
    name: "TMDB",
    href: "https://www.themoviedb.org/",
    use: "Film details, posters, cast and crew.",
    notice: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  },
  {
    name: "JustWatch",
    href: "https://www.justwatch.com/",
    use: "Where each film is streaming, free, or for rent or sale in your country.",
    notice: null,
  },
];

export default function CreditsPage() {
  return (
    <>
      <PlainHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md text-ink-strong md:text-display-lg">Credits</h1>
          <p className="text-body-md text-body">Next Movie is built on data from these services.</p>
        </div>
        <ul className="flex flex-col border-t border-border">
          {CREDITS.map((c) => (
            <li key={c.name} className="flex flex-col gap-2 border-b border-border py-5">
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 text-body-md font-semibold text-ink-strong underline-offset-4 hover:underline"
              >
                {c.name}
                <ArrowUpRightIcon className="size-4 text-mute" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="text-body-sm text-body">{c.use}</p>
              {c.notice && <p className="text-body-sm text-mute">{c.notice}</p>}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
