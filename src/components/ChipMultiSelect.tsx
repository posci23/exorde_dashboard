"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, FieldLabel, TextInput } from "./ui";

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
  options,
  selected,
  onChange,
  max,
  emptyLabel = "None selected",
  searchPlaceholder = "Search…",
  customPlaceholder,
  footnote,
}: Props) {
  const [open, setOpen] = useState(false);
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
    : emptyLabel;

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
      <FieldLabel hint={max ? `${selected.length}/${max}${hint ? ` · ${hint}` : ""}` : hint}>
        {label}
      </FieldLabel>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-left text-sm outline-none transition-colors hover:border-border-strong focus:border-accent"
      >
        <span className={`truncate ${selected.length ? "text-text" : "text-text-muted"}`}>{summary}</span>
        <span className="shrink-0 text-xs text-text-subtle" aria-hidden>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-surface-raised p-2 shadow-xl shadow-black/40" role="listbox" aria-multiselectable="true">
          <TextInput
            autoFocus
            placeholder={searchPlaceholder}
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
              Select {search ? "matches" : "all"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(custom)}>
              Clear listed
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear all
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
              <li className="px-2 py-3 text-xs text-text-muted">No option matches “{search}”. {customPlaceholder ? "Add it as a custom value below." : ""}</li>
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
                  Add
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
                title={`Remove ${value}`}
                onClick={() => toggle(value, false)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  option
                    ? "bg-accent-soft text-accent hover:bg-accent/20"
                    : "bg-surface-hover font-mono text-text-muted hover:text-danger"
                }`}
              >
                {option?.label ?? value} ×
              </button>
            );
          })}
        </div>
      )}

      {footnote && <p className="text-xs leading-relaxed text-text-subtle">{footnote}</p>}
      {atMax && <p className="text-xs text-warning">Maximum of {max} reached.</p>}
    </div>
  );
}
