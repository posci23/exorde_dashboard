"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, PLATFORMS } from "@/lib/constants";
import {
  formatDomainList,
  getCustomDomains,
  getSelectedPlatformDomains,
  setCustomDomainsText,
  setPlatformSelection,
} from "@/lib/query-form";
import { Button, FieldLabel, TextArea } from "./ui";

type Props = {
  domainsText: string;
  onChange: (domainsText: string) => void;
};

export function PlatformPicker({ domainsText, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = getSelectedPlatformDomains(domainsText);
  const custom = getCustomDomains(domainsText);
  const selectedSet = new Set(selected);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const summary =
    selected.length === 0 && custom.length === 0
      ? "All platforms (no domain filter)"
      : [
          ...selected.map((d) => PLATFORMS.find((p) => p.domain === d)?.label ?? d),
          ...custom,
        ].join(", ");

  function toggleAllKnown(on: boolean) {
    if (on) {
      onChange(formatDomainList([...PLATFORMS.map((p) => p.domain), ...custom]));
    } else {
      onChange(formatDomainList(custom));
    }
  }

  return (
    <div className="space-y-3" ref={rootRef}>
      <div>
        <FieldLabel hint={`max ${LIMITS.maxDomains} · exact match`}>Platforms</FieldLabel>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-left text-sm outline-none hover:border-accent/50 focus:border-accent"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={selected.length || custom.length ? "text-text" : "text-text-muted"}>
            {summary}
          </span>
          <span className="shrink-0 font-mono text-xs text-text-muted">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-bg-elevated p-2 shadow-lg"
            role="listbox"
            aria-multiselectable="true"
          >
            <div className="mb-2 flex flex-wrap gap-2 border-b border-border px-1 pb-2">
              <Button type="button" variant="ghost" onClick={() => toggleAllKnown(true)}>
                Select all listed
              </Button>
              <Button type="button" variant="ghost" onClick={() => toggleAllKnown(false)}>
                Clear listed
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear all
              </Button>
            </div>
            <ul className="space-y-0.5">
              {PLATFORMS.map((platform) => {
                const checked = selectedSet.has(platform.domain);
                return (
                  <li key={platform.domain}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-bg-panel ${
                        checked ? "bg-accent/10" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) =>
                          onChange(setPlatformSelection(domainsText, platform.domain, e.target.checked))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-text">{platform.label}</span>
                        <span className="block font-mono text-[11px] text-accent">{platform.domain}</span>
                        {platform.note && (
                          <span className="mt-0.5 block text-[11px] text-text-muted">{platform.note}</span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {(selected.length > 0 || custom.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((domain) => {
            const label = PLATFORMS.find((p) => p.domain === domain)?.label ?? domain;
            return (
              <button
                key={domain}
                type="button"
                className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-accent hover:bg-accent/20"
                onClick={() => onChange(setPlatformSelection(domainsText, domain, false))}
                title={`Remove ${domain}`}
              >
                {label} ×
              </button>
            );
          })}
          {custom.map((domain) => (
            <button
              key={domain}
              type="button"
              className="rounded-md border border-border bg-bg-elevated px-2 py-1 font-mono text-[11px] text-text-muted hover:border-danger/40 hover:text-danger"
              onClick={() =>
                onChange(formatDomainList([...selected, ...custom.filter((d) => d !== domain)]))
              }
              title={`Remove ${domain}`}
            >
              {domain} ×
            </button>
          ))}
        </div>
      )}

      <div>
        <FieldLabel hint="domains not in the list above">Custom domains</FieldLabel>
        <TextArea
          rows={2}
          placeholder="example-forum.com, other-instance.social"
          value={custom.join(", ")}
          onChange={(e) => onChange(setCustomDomainsText(domainsText, e.target.value))}
        />
        <p className="mt-1.5 text-[11px] text-text-muted">
          Leave empty for all platforms. Exorde covers 200+ sources — use custom domains for anything not listed.
          Subreddits / channels often work better via <span className="font-mono">url_patterns</span>.
        </p>
      </div>
    </div>
  );
}
