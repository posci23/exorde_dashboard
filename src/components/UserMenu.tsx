"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { LanguageToggle } from "./LanguageToggle";
import { apiFetch } from "@/lib/browser-api";
import { LOCALES, useLocale } from "@/lib/i18n/locale";
import type { UserInfoResponse } from "@/lib/types";

function initials(info: UserInfoResponse | null, fallback: string): string {
  const email = info?.email?.trim();
  if (email) return email[0]?.toUpperCase() ?? fallback;
  if (info?.organization?.trim()) return info.organization.trim()[0]?.toUpperCase() ?? fallback;
  return fallback;
}

function displayName(info: UserInfoResponse | null, guest: string): string {
  if (info?.email?.trim()) return info.email.trim();
  if (info?.organization?.trim()) return info.organization.trim();
  return guest;
}

export function UserMenu() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<UserInfoResponse | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || info) return;
    void (async () => {
      const res = await apiFetch<UserInfoResponse>("/api/sentinel/user-info");
      if (res.ok && res.data) setInfo(res.data);
    })();
  }, [open, info]);

  const letter = initials(info, "S");
  const name = displayName(info, t.userMenu.guest);
  const plan = info?.plan?.trim();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.userMenu.openMenu}
        onClick={() => setOpen((v) => !v)}
        className="flex w-[72px] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors hover:bg-surface-hover"
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
            open
              ? "bg-accent-solid text-accent-fg shadow-[var(--shadow-1)]"
              : "bg-accent-soft text-accent-on-soft"
          }`}
        >
          {letter}
        </span>
        <span className="text-xs font-medium leading-4 text-text-subtle">{t.userMenu.account}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.userMenu.account}
          className="fixed bottom-20 right-2 z-50 w-72 overflow-hidden rounded-xl border border-outline-variant/50 bg-surface shadow-[var(--shadow-3)] md:absolute md:bottom-0 md:left-[calc(100%+8px)] md:right-auto"
        >
          <div className="border-b border-outline-variant/40 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-on-soft">
                {letter}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{name}</p>
                {plan ? (
                  <p className="mt-0.5 truncate text-xs text-text-muted">{plan}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-text-subtle">{t.userMenu.signedInLocally}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-2 py-2">
            <MenuLink
              href="/status"
              icon="status"
              label={t.nav.status.label}
              hint={t.nav.status.hint}
              active={pathname.startsWith("/status")}
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/settings"
              icon="settings"
              label={t.userMenu.preferences}
              hint={t.userMenu.preferencesHint}
              active={pathname.startsWith("/settings")}
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/reference"
              icon="book"
              label={t.nav.reference.label}
              hint={t.nav.reference.hint}
              active={pathname.startsWith("/reference")}
              onNavigate={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-outline-variant/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-text">{t.common.language}</span>
              <LanguageToggle />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-subtle">
              {LOCALES.map((l) => l.label).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  hint,
  active,
  onNavigate,
}: {
  href: string;
  icon: IconName;
  label: string;
  hint: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`mx-0 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-container-high ${
        active ? "bg-accent-soft" : ""
      }`}
    >
      <Icon name={icon} className={`h-5 w-5 ${active ? "text-accent-on-soft" : "text-text-muted"}`} />
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${active ? "text-accent-on-soft" : "text-text"}`}>
          {label}
        </span>
        <span className="block truncate text-xs text-text-subtle">{hint}</span>
      </span>
    </Link>
  );
}
