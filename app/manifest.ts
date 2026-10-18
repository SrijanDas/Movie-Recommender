import type { MetadataRoute } from "next";

// Makes the site installable. Colours match DESIGN.md's canvas.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Next Movie",
    short_name: "Next Movie",
    description: "Tap a few films you love and we’ll tell you what to watch next, and why.",
    start_url: "/recommendations",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101010",
    theme_color: "#101010",
    categories: ["entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Watchlist", url: "/watchlist", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My films", url: "/my-movies", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
