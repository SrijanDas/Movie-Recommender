import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader, AppTabBar, PlainHeader, SignedOutNav } from "@/components/site/header";
import { JoinBar } from "@/components/site/join-bar";
import { getCurrentUserId } from "@/lib/auth";
import { isOnboarded } from "@/lib/onboarding";

// Film pages are public (proxy.ts), so profiles can link to them. Members get
// the app shell; visitors get the plain header and a join bar. Members who
// haven't onboarded are sent to /onboarding, as in the (app) layout.
async function Header() {
  const userId = await getCurrentUserId();
  if (!userId) return <PlainHeader><SignedOutNav /></PlainHeader>;
  if (!(await isOnboarded(userId))) redirect("/onboarding");
  return <AppHeader />;
}

// The bottom bar and the room it needs: the tab bar on phones for members,
// the join bar on every size for visitors.
async function Bottom() {
  const userId = await getCurrentUserId();
  return userId ? (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />
      <AppTabBar />
    </>
  ) : (
    <>
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0" />
      <JoinBar viewer="visitor" />
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
