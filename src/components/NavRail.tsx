"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n/locale";

const ADVANCED_HREFS = ["/query", "/status", "/reference", "/settings"];

export function NavRail() {
  const pathname = usePathname();
  const t = useT();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  const searchActive = pathname === "/";
  const jobsActive = pathname.startsWith("/jobs");
  const advancedActive = ADVANCED_HREFS.some((href) => pathname.startsWith(href));

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!advancedRef.current?.contains(e.target as Node)) setAdvancedOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAdvancedOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setAdvancedOpen(false);
  }, [pathname]);

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-20 shrink-0 flex-col items-center bg-surface py-3">
      <Link
        href="/"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold tracking-tight text-text"
        aria-label={t.nav.product}
        title={t.nav.product}
      >
        S
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        <RailItem href="/" icon="search" label={t.nav.search.label} active={searchActive} />
        <RailItem href="/jobs" icon="jobs" label={t.nav.jobs.label} active={jobsActive} />

        <div className="relative" ref={advancedRef}>
          <button
            type="button"
            aria-expanded={advancedOpen}
            aria-haspopup="menu"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-[72px] flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-text transition-colors hover:bg-surface-hover"
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                advancedActive || advancedOpen ? "bg-accent-soft text-accent-on-soft" : "text-text-muted"
              }`}
            >
              <Icon name="tune" />
            </span>
            <span className="text-[11px] font-medium leading-none text-text-muted">{t.nav.advanced.label}</span>
          </button>

          {advancedOpen && (
            <div
              role="menu"
              aria-label={t.nav.advanced.label}
              className="absolute top-0 left-[calc(100%+8px)] z-50 min-w-56 rounded-xl bg-surface-container-low py-2 shadow-[var(--shadow-3)]"
            >
              <p className="px-4 pb-1 pt-1 text-xs text-text-subtle">{t.nav.advanced.hint}</p>
              <MenuRow
                href="/query"
                icon="filters"
                label={t.nav.filters.label}
                hint={t.nav.filters.hint}
                active={pathname.startsWith("/query")}
              />
              <MenuRow
                href="/status"
                icon="status"
                label={t.nav.status.label}
                hint={t.nav.status.hint}
                active={pathname.startsWith("/status")}
              />
              <MenuRow
                href="/reference"
                icon="book"
                label={t.nav.reference.label}
                hint={t.nav.reference.hint}
                active={pathname.startsWith("/reference")}
              />
              <MenuRow
                href="/settings"
                icon="settings"
                label={t.nav.settings.label}
                hint={t.nav.settings.hint}
                active={pathname.startsWith("/settings")}
              />
            </div>
          )}
        </div>
      </nav>

      <div className="pb-2">
        <LanguageToggle />
      </div>
    </aside>
  );
}

function RailItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex w-[72px] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors hover:bg-surface-hover"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
          active ? "bg-accent-soft text-accent-on-soft" : "text-text-muted"
        }`}
      >
        <Icon name={icon} />
      </span>
      <span className={`text-[11px] font-medium leading-none ${active ? "text-text" : "text-text-muted"}`}>
        {label}
      </span>
    </Link>
  );
}

function MenuRow({
  href,
  icon,
  label,
  hint,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  hint: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      className={`mx-2 flex items-center gap-3 rounded-full px-3 py-2.5 transition-colors hover:bg-surface-container-high ${
        active ? "bg-accent-soft" : ""
      }`}
    >
      <Icon name={icon} className={`h-5 w-5 ${active ? "text-accent-on-soft" : "text-text-muted"}`} />
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${active ? "text-accent-on-soft" : "text-text"}`}>{label}</span>
        <span className="block truncate text-xs text-text-subtle">{hint}</span>
      </span>
    </Link>
  );
}
