"use client";

import { useEffect, useSyncExternalStore } from "react";

// PWA plumbing: registers public/sw.js and keeps the browser's install prompt
// (Chrome/Android's `beforeinstallprompt`) so the Account page can offer it.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // offer it from our own button instead
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallState = "installed" | "prompt" | "ios" | "manual" | "unknown";

function installState(): InstallState {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return "installed";
  if (deferred) return "prompt";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "manual";
}

// "unknown" during server render and hydration.
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, installState, () => "unknown");
}

export async function promptInstall() {
  if (!deferred) return;
  const event = deferred;
  deferred = null;
  await event.prompt();
  await event.userChoice;
  notify();
}

export function ServiceWorker() {
  useEffect(() => {
    // Dev stays service-worker free so it never caches a stale build.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(console.error);
  }, []);
  return null;
}
