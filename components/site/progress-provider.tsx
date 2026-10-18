"use client";

import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";

// The thin green bar across the top while a page navigation is in flight.
// It starts on link clicks; for code-driven navigation, use `useRouter` from
// `@bprogress/next/app` instead of `next/navigation`.
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <BProgressProvider
      color="var(--primary)"
      height="2px"
      delay={120} // don't flash on instant (prefetched) navigations
      options={{ showSpinner: false }}
      shallowRouting
      disableSameURL
    >
      {children}
    </BProgressProvider>
  );
}
