import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ProgressProvider } from "@/components/site/progress-provider";
import { ServiceWorker } from "@/components/site/pwa";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Next Movie", template: "%s · Next Movie" },
  description: "Tap a few films you love and we’ll tell you what to watch next, and why.",
  applicationName: "Next Movie",
  // Installed on iOS: full screen, content runs under the status bar (the
  // headers pad by env(safe-area-inset-top)).
  appleWebApp: { capable: true, title: "Next Movie", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#101010",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProgressProvider>{children}</ProgressProvider>
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}
