"use client";

import { useT } from "@/lib/i18n/locale";

/** Persistent Hybrid Atlantic mark — top-right on every screen. */
export function BrandCorner() {
  const t = useT();

  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-20 sm:right-5 sm:top-4 md:right-6 md:top-5"
      aria-hidden
    >
      <p className="text-right text-sm font-semibold leading-tight tracking-wide text-accent sm:text-base md:text-lg">
        {t.nav.brand}
      </p>
    </div>
  );
}
