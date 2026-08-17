"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, FieldLabel, TextInput } from "./ui";
import { useT } from "@/lib/i18n/locale";

export type ChipOption = {
  value: string;
  label: string;
  note?: string;
  /** Optional grouping header inside the dropdown. */
  group?: string;
};

type Props = {
  label: string;
  hint?: string;
  /** Hover explainer shown next to the label. */
  help?: ReactNode;
  /** The full option catalog — this is what makes the available choices discoverable. */
  options: readonly ChipOption[];
  /** Currently selected values, including any that aren't in `options`. */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  max?: number;
  emptyLabel?: string;
  searchPlaceholder?: string;
  /** Show a free-text row for values outside the catalog (custom domains, rare language codes). */
  customPlaceholder?: string;
  footnote?: string;
};

export function ChipMultiSelect({
  label,
  hint,
  help,
  options,
  selected,
  onChange,
  max,
  emptyLabel,
  searchPlaceholder,
  customPlaceholder,
  footnote,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // useId rather than a slug of the label: two pickers can share a label, and
  // duplicate ids would make aria-controls ambiguous.
  const panelId = useId();
  const [search, setSearch] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const known = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selectedSet = new Set(selected);
  const custom = selected.filter((v) => !known.has(v));

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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.value.toLowerCase().includes(needle) ||
        o.label.toLowerCase().includes(needle) ||
        o.group?.toLowerCase().includes(needle),
    );
  }, [options, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChipOption[]>();
    for (const option of filtered) {
      const key = option.group ?? "";
      const list = map.get(key);
      if (list) list.push(option);
      else map.set(key, [option]);
    }
    return [...map.entries()];
  }, [filtered]);

  const atMax = max != null && selected.length >= max;
  const summary = selected.length
    ? selected.map((v) => known.get(v)?.label ?? v).join(", ")
    : (emptyLabel ?? t.chips.noneSelected);

  function toggle(value: string, on: boolean) {
    onChange(on ? [...selected, value] : selected.filter((v) => v !== value));
  }

  function addCustom() {
    const entries = customDraft
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s && !selectedSet.has(s));
    if (entries.length) onChange([...selected, ...entries]);
    setCustomDraft("");
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <FieldLabel help={help} hint={max ? `${selected.length}/${max}${hint ? ` · ${hint}` : ""}` : hint}>
        {label}
      </FieldLabel>

      {/* The panel unmounts when closed so autoFocus re-fires on each open;
          aria-controls is therefore only set while it is in the document. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-left text-sm outline-none transition-colors hover:border-outline focus:border-accent"
      >
        <span className={`truncate ${selected.length ? "text-text" : "text-text-muted"}`}>{summary}</span>
        <span className="shrink-0 text-xs text-text-subtle" aria-hidden>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t.chips.optionsAria(label)}
          className="rounded-xl bg-surface-container-low p-2 shadow-[var(--shadow-3)]"
        >
          <TextInput
            autoFocus
            type="search"
            aria-label={searchPlaceholder ?? t.chips.search}
            placeholder={searchPlaceholder ?? t.chips.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="mt-2 flex flex-wrap gap-1 border-b border-border pb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={max != null && filtered.length > max}
              onClick={() => {
                const merged = [...new Set([...selected, ...filtered.map((o) => o.value)])];
                onChange(max != null ? merged.slice(0, max) : merged);
              }}
            >
              {search ? t.chips.selectMatches : t.chips.selectAll}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(custom)}>
              {t.chips.clearListed}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              {t.chips.clearAll}
            </Button>
          </div>

          <ul className="mt-1 max-h-64 space-y-0.5 overflow-auto">
            {grouped.map(([group, items]) => (
              <li key={group || "_"}>
                {group && (
                  <div className="label-caps px-2 pb-1 pt-2">{group}</div>
                )}
                <ul className="space-y-0.5">
                  {items.map((option) => {
                    const checked = selectedSet.has(option.value);
                    return (
                      <li key={option.value}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover ${
                            checked ? "bg-accent-soft" : ""
                          } ${!checked && atMax ? "opacity-40" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            disabled={!checked && atMax}
                            onChange={(e) => toggle(option.value, e.target.checked)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-text">{option.label}</span>
                            <span className="block font-mono text-xs text-text-subtle">{option.value}</span>
                            {option.note && (
                              <span className="mt-0.5 block text-xs text-text-muted">{option.note}</span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {!filtered.length && (
              <li className="px-2 py-3 text-xs text-text-muted">{t.chips.noMatch(search)} {customPlaceholder ? t.chips.addAsCustom : ""}</li>
            )}
          </ul>

          {customPlaceholder && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="flex gap-2">
                <TextInput
                  placeholder={customPlaceholder}
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                />
                <Button type="button" variant="secondary" size="sm" disabled={!customDraft.trim()} onClick={addCustom}>
                  {t.chips.addCustom}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const option = known.get(value);
            return (
              <button
                key={value}
                type="button"
                aria-label={t.chips.removeAria(option?.label ?? value)}
                title={t.chips.removeAria(value)}
                onClick={() => toggle(value, false)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  option
                    ? "bg-accent-soft text-accent-on-soft hover:bg-accent-soft/80"
                    : "bg-surface-container-high font-mono text-text-muted hover:text-danger"
                }`}
              >
                {option?.label ?? value} ×
              </button>
            );
          })}
        </div>
      )}

      {footnote && <p className="text-xs leading-relaxed text-text-subtle">{footnote}</p>}
      {atMax && <p className="text-xs text-warning">{t.chips.maxReached(max)}</p>}
    </div>
  );
}
