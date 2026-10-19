import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader, AppTabBar, PlainHeader, SignedOutNav } from "@/components/site/header";
import { getCurrentUserId } from "@/lib/auth";
import { isOnboarded } from "@/lib/onboarding";

// Film pages are public (proxy.ts), so profiles can link to them. Members get
// the app shell; visitors get the plain header with Sign in. Members who
// haven't onboarded are sent to /onboarding, as in the (app) layout.
async function Header() {
  const userId = await getCurrentUserId();
  if (!userId) return <PlainHeader><SignedOutNav /></PlainHeader>;
  if (!(await isOnboarded(userId))) redirect("/onboarding");
  return <AppHeader />;
}

// Members' tab bar on phones, and the room it needs. Visitors get none.
async function Bottom() {
  if (!(await getCurrentUserId())) return null;
  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />
      <AppTabBar />
    </>
  );
}

export default function MovieLayout({ children }: LayoutProps<"/movie">) {
  return (
    <>
      <Suspense fallback={<PlainHeader />}>
        <Header />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
      <Suspense fallback={null}>
        <Bottom />
      </Suspense>
    </>
  );
}
