import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SlipSense",
    short_name: "SlipSense",
    description: "Educational bet slip risk analyzer.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0ea5e9",
    icons: [{ src: "/icon.svg", type: "image/svg+xml" }]
  };
}
