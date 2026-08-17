"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { SeescapeMark } from "./SeescapeMark";
import { UserMenu } from "./UserMenu";
import { useT } from "@/lib/i18n/locale";

export function NavRail() {
  const pathname = usePathname();
  const t = useT();

  const searchActive = pathname === "/";
  const jobsActive = pathname.startsWith("/jobs");
  const advancedActive = pathname.startsWith("/query");

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-20 shrink-0 flex-col items-center border-r border-outline-variant/60 bg-surface/80 py-3 backdrop-blur-md">
      <Link
        href="/"
        className="mb-4"
        aria-label={t.nav.product}
        title={t.nav.product}
      >
        <SeescapeMark size="md" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        <RailItem href="/" icon="search" label={t.nav.search.label} active={searchActive} />
        <RailItem href="/jobs" icon="jobs" label={t.nav.jobs.label} active={jobsActive} />
        <RailItem
          href="/query"
          icon="tune"
          label={t.nav.advanced.label}
          active={advancedActive}
        />
      </nav>

      <div className="pb-2">
        <UserMenu />
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
          active ? "bg-accent-solid text-accent-fg shadow-[var(--shadow-1)]" : "text-accent/70"
        }`}
      >
        <Icon name={icon} />
      </span>
      <span className={`text-[11px] font-medium leading-none ${active ? "text-accent" : "text-text-subtle"}`}>
        {label}
      </span>
    </Link>
  );
}
