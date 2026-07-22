import { ThemeProvider, themeInitScript } from "@axon/ui";

import { SessionExpiryDialog } from "@/components/workspace/session-expiry-dialog";
import { type Metadata } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { type ReactNode } from "react";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AXON",
    template: "%s — AXON",
  },
  description: "Living architecture intelligence for production systems.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Applies the persisted theme before first paint to prevent a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <SessionExpiryDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
