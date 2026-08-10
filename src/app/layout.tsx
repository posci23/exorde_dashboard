import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { QueryStoreProvider } from "@/components/QueryStore";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
});

const mono = JetBrains_Mono({
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased">
        <QueryStoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
            </main>
          </div>
        </QueryStoreProvider>
      </body>
    </html>
  );
}
