import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlipSense",
  description: "AI-powered bet slip analyzer for grading wagers, parlays, odds risk, and bankroll exposure."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
