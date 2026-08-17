"use client";

import { useT } from "@/lib/i18n/locale";

/** Indeterminate loading for simple search — tied to the live preview request, not fake progress. */
export function SearchLoading() {
  const t = useT();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex w-full flex-col items-center gap-4 py-6"
    >
      <div className="relative flex h-20 w-20 items-center justify-center" aria-hidden>
        <span className="search-ripple absolute inset-0 rounded-full border border-accent/35" />
        <span className="search-ripple search-ripple-delay-1 absolute inset-0 rounded-full border border-accent/25" />
        <span className="search-ripple search-ripple-delay-2 absolute inset-0 rounded-full border border-sea-accent/40" />

        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="relative text-accent">
          <path
            d="M2 14c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="search-wave"
          />
          <path
            d="M2 18c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
            className="search-wave search-wave-delay"
          />
        </svg>
      </div>

      <p className="text-sm text-text-muted">{t.search.searching}</p>
    </div>
  );
}

export function SearchSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`search-spinner ${className}`}
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14 42"
      />
    </svg>
  );
}
