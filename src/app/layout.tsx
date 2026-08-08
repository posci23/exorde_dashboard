import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { QueryStoreProvider } from "@/components/QueryStore";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
});

export const metadata: Metadata = {
  title: "Exorde Data Export Dashboard",
  description: "Complete operator console for the Exorde Data Export API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <QueryStoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-auto">
              <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
            </main>
          </div>
        </QueryStoreProvider>
      </body>
    </html>
  );
}
