import { cacheLife } from "next/cache";
import Link from "next/link";

// Cached so the footer stays prerenderable (Cache Components rejects a bare
// new Date()); refreshed daily so it rolls over on New Year without a deploy.
async function Year() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const LINK =
  "-mx-1 rounded px-1 text-body-sm text-body outline-none transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/sign-up", label: "Get started" },
  { href: "/sign-in", label: "Sign in" },
];

const CREDITS =
  "-mx-1 shrink-0 rounded px-1 outline-none transition-colors hover:text-body focus-visible:ring-3 focus-visible:ring-ring/50";

// A profile's footer: one quiet, centred line, so the page ends on their films, not on us.
export function ProfileFooter() {
  return (
    <footer className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-6">
      <p className="border-t border-border pt-5 text-center text-caption text-mute">
        © <Year /> Next Movie
      </p>
    </footer>
  );
}

// The landing page's footer: a brand line, the ways in, and a quiet link to /credits, which is where the services
// we build on are named.
export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-border bg-canvas">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-12 md:px-8 md:pt-16">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-2">
            <p className="text-display-sm text-balance text-ink-strong">Made for people who know what they love.</p>
            <p className="text-body-sm text-pretty text-body">
              Tap a few films you love. We’ll tell you what to watch next, and why.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 sm:flex-col sm:items-end">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5 text-caption text-mute">
          <p>
            © <Year /> Next Movie
          </p>
          <Link href="/credits" className={CREDITS}>
            Credits
          </Link>
        </div>
      </div>

      {/* The wordmark as the page's last frame, cropped by the bottom edge like a title card. */}
      <p
        aria-hidden
        className="mx-auto mb-[-0.22em] w-full max-w-6xl px-4 pt-6 text-[clamp(3.5rem,16vw,12rem)] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap text-hairline select-none md:px-8"
      >
        Next Movie
      </p>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </footer>
  );
}
