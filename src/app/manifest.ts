import type { MetadataRoute } from "next";

import { BRAND } from "@/lib/brand";

/** Makes Forkcast installable: its own icon, its own window, no browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#08080B",
    categories: ["food", "lifestyle"],
    lang: "en-IN",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "History", short_name: "History", description: "Menus you've scanned", url: "/history", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Your taste", short_name: "Taste", description: "Edit what you like", url: "/taste", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
