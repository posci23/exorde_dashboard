"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", hint: "Health, queue, your quota" },
  { href: "/query", label: "Query", hint: "Build · preview · export" },
  { href: "/jobs", label: "Jobs", hint: "Monitor · download · history" },
  { href: "/fields", label: "Fields", hint: "What each column means" },
  { href: "/limits", label: "Limits & errors", hint: "Caps and what to do on failure" },
  { href: "/settings", label: "Settings", hint: "API key" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg-elevated/80 backdrop-blur">
      <div className="border-b border-border px-5 py-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">Exorde</div>
        <h1 className="mt-1 font-mono text-lg font-semibold tracking-tight text-text">Data Export</h1>
        <p className="mt-1 text-xs text-text-muted">Operator console</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 transition ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:bg-bg-panel hover:text-text"
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block text-[11px] text-text-muted">{item.hint}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-[11px] leading-relaxed text-text-muted">
        Proxy → <span className="font-mono text-text">export-api.exorde.io</span>
        <br />
        Key via <span className="font-mono">.env.local</span> or Settings
      </div>
    </aside>
  );
}
