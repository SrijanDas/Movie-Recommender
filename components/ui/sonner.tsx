"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Matches sonner's own mobile breakpoint, where toasts go full width.
const MOBILE_QUERY = "(max-width: 600px)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    // Mobile-first: assume a phone until the client says otherwise.
    () => true,
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const isMobile = useIsMobile()

  return (
    <Sonner
      // Dark only — see DESIGN.md.
      theme="dark"
      className="toaster group"
      // Phones: drop in from the top, clear of the bottom tab bar. Swipe up or sideways to dismiss.
      position={isMobile ? "top-center" : "bottom-center"}
      swipeDirections={isMobile ? ["top", "left", "right"] : ["bottom", "left", "right"]}
      mobileOffset={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
      closeButton
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast pr-12!",
          // Sonner's default is a 20px badge on the corner; make it a real tap target inside the toast.
          closeButton:
            "left-auto! right-2! top-1/2! size-8! -translate-y-1/2! transform-none! border-0! bg-transparent! text-muted-foreground! hover:text-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
