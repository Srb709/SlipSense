import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlipSense",
  description: "Educational bet slip risk analyzer for structure, odds pressure, and bankroll exposure.",
  appleWebApp: { capable: true, title: "SlipSense" },
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-touch-icon.svg" }
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
