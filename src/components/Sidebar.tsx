"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n/locale";

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  const nav = [
    { href: "/", ...t.nav.overview },
    { href: "/query", ...t.nav.query },
    { href: "/jobs", ...t.nav.jobs },
    { href: "/reference", ...t.nav.reference },
    { href: "/settings", ...t.nav.settings },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-start justify-between gap-3 px-6 py-6">
        <div className="min-w-0">
          <div className="label-caps text-accent">{t.nav.brand}</div>
          <h1 className="mt-1.5 text-base font-semibold tracking-tight text-text">
            {t.nav.product}
          </h1>
        </div>
        <LanguageToggle />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2.5 transition-colors ${
                active ? "bg-accent-soft" : "hover:bg-surface-hover"
              }`}
            >
              <span
                className={`block text-sm font-medium ${active ? "text-accent" : "text-text"}`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-xs text-text-subtle">{item.hint}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 text-xs leading-relaxed text-text-subtle">
        {t.nav.proxiedTo} <span className="font-mono text-text-muted">export-api.exorde.io</span>
      </div>
    </aside>
  );
}
