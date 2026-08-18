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
  const analyzeActive = pathname.startsWith("/analyze");

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex h-[4.5rem] items-stretch border-t border-outline-variant/60 bg-surface/95 px-2 backdrop-blur-md md:sticky md:top-0 md:h-screen md:w-20 md:shrink-0 md:flex-col md:items-center md:border-r md:border-t-0 md:px-0 md:py-3">
      <Link
        href="/"
        className="hidden md:mb-4 md:block"
        aria-label={t.nav.product}
        title={t.nav.product}
      >
        <SeescapeMark size="md" />
      </Link>

      <nav className="flex flex-1 items-stretch justify-around gap-0 md:flex-col md:items-center md:justify-start md:gap-1">
        <RailItem href="/" icon="search" label={t.nav.search.label} active={searchActive} />
        <RailItem href="/jobs" icon="jobs" label={t.nav.jobs.label} active={jobsActive} />
        <RailItem
          href="/query"
          icon="tune"
          label={t.nav.advanced.label}
          active={advancedActive}
        />
        <RailItem
          href="/analyze"
          icon="insights"
          label={t.nav.analyze.label}
          active={analyzeActive}
        />
      </nav>

      <div className="hidden pb-2 md:block">
        <UserMenu />
      </div>

      <div className="flex items-center md:hidden">
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
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-colors hover:bg-surface-hover md:w-[72px] md:flex-none md:gap-1 md:py-1.5"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors md:w-14 ${
          active ? "bg-accent-solid text-accent-fg shadow-[var(--shadow-1)]" : "text-accent/70"
        }`}
      >
        <Icon name={icon} />
      </span>
      <span
        className={`max-w-full truncate text-[10px] font-medium leading-none sm:text-[11px] ${
          active ? "text-accent" : "text-text-subtle"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
