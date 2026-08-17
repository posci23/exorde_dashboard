import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { QueryStoreProvider } from "@/components/QueryStore";
import { NavRail } from "@/components/NavRail";
import { LocaleProvider } from "@/lib/i18n/locale";
import "./globals.css";

/* The three Hybrid Atlantic faces, matching hybridatlantic.com. */
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
});

const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  variable: "--font-display-loaded",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
});

export const metadata: Metadata = {
  title: "Sentinel — Hybrid Atlantic",
  description: "Signal collection and export console for political intelligence work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="antialiased">
        <LocaleProvider>
          <QueryStoreProvider>
            <div className="flex min-h-screen">
              <NavRail />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </QueryStoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
