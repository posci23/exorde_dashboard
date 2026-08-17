"use client";

import { useT } from "@/lib/i18n/locale";

/** Persistent Hybrid Atlantic mark — top-left of the main content column. */
export function BrandCorner() {
  const t = useT();

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-20 px-4 pt-3 sm:px-6 sm:pt-4 md:pt-5"
      aria-hidden
    >
      <p className="whitespace-nowrap text-left text-sm font-semibold leading-tight tracking-wide text-accent sm:text-base md:text-lg">
        {t.nav.brand}
      </p>
    </div>
  );
}
