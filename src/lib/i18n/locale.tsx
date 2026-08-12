"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

export const LOCALES: ReadonlyArray<{ value: Locale; label: string; short: string }> = [
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
];

const DICTS = { en, es } as const;
const STORAGE_KEY = "sentinel.locale.v1";

type Ctx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** The active dictionary. Nested, so `t.nav.query` is checked at compile time. */
  t: typeof en;
  /** False until localStorage has been read, to keep SSR and first paint in step. */
  ready: boolean;
};

const LocaleCtx = createContext<Ctx | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "es";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
    } else if (navigator.language?.toLowerCase().startsWith("es")) {
      // Honour the browser's preference on a first visit, then remember whatever
      // the user picks from then on.
      setLocaleState("es");
    }
    setReady(true);
  }, []);

  // Keep the document language in step so screen readers and the browser's own
  // translation prompt see the language actually on screen.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: DICTS[locale], ready }),
    [locale, setLocale, ready],
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Shorthand for the common case of only needing the dictionary. */
export function useT(): typeof en {
  return useLocale().t;
}
