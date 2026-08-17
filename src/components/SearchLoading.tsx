"use client";

import { useT } from "@/lib/i18n/locale";

/** Indeterminate loading for simple search — tied to the live preview request. */
export function SearchLoading() {
  const t = useT();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex w-full flex-col items-center gap-3 py-6"
    >
      <SearchSpinner className="h-10 w-10" />
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
        className="text-accent"
      />
    </svg>
  );
}
