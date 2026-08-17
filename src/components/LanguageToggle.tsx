"use client";

import { LOCALES, useLocale } from "@/lib/i18n/locale";

/**
 * Two-state language switch in the sidebar header. A segmented pair rather than
 * a dropdown: with only two options every choice stays visible, matching how the
 * rest of the builder treats small enums.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className="inline-flex shrink-0 gap-0.5 rounded-full border border-outline-variant/50 bg-surface/80 p-0.5"
    >
      {LOCALES.map((option) => {
        const active = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            onClick={() => setLocale(option.value)}
            aria-pressed={active}
            // The visible label is the code; the full name is what gets announced.
            aria-label={option.label}
            title={option.label}
            className={`rounded-full px-1.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? "bg-accent-solid text-accent-fg"
                : "text-accent/70 hover:bg-accent-soft/50 hover:text-accent-on-soft"
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
