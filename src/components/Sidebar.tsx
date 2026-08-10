"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", hint: "Health, queue, your quota" },
  { href: "/query", label: "Query", hint: "Build · preview · export" },
  { href: "/jobs", label: "Jobs", hint: "Monitor · download · history" },
  { href: "/reference", label: "Reference", hint: "Every option, field, and limit" },
  { href: "/settings", label: "Settings", hint: "API key" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-6 py-6">
        <div className="label-caps text-accent">Exorde</div>
        <h1 className="mt-1.5 text-base font-semibold tracking-tight text-text">Data Export</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
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
        Proxied to <span className="font-mono text-text-muted">export-api.exorde.io</span>
      </div>
    </aside>
  );
}
