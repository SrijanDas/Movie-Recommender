import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader, AppTabBar } from "@/components/site/header";
import { getCurrentUserId } from "@/lib/auth";
import { isOnboarded } from "@/lib/onboarding";

// Every screen here needs an account (proxy.ts) and a finished onboarding.
// The check streams alongside the page instead of blocking it: sign-in
// already routes new users to /onboarding, so this only catches stragglers.
async function OnboardingGate() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/sign-in");
  if (!(await isOnboarded(userId))) redirect("/onboarding");
  return null;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <OnboardingGate />
      </Suspense>
      {/* Room for the bottom tab bar on phones. */}
      <main className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <AppTabBar />
    </>
  );
}
