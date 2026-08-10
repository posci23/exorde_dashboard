"use client";

import { useState, type ReactNode } from "react";
import { apiDateToInput, inputDateToApi } from "@/lib/query-form";

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-bg-panel/80 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl text-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-accent text-bg hover:bg-accent/90",
    secondary: "border border-border-strong bg-bg-elevated text-text hover:border-accent/50",
    danger: "bg-danger/20 text-danger hover:bg-danger/30",
    ghost: "text-text-muted hover:bg-bg-elevated hover:text-text",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label className="text-xs font-medium text-text-muted">{children}</label>
      {hint && <span className="text-[10px] text-text-muted/80">{hint}</span>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted/50 focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-text outline-none placeholder:text-text-muted/50 focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const styles = {
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
  }[tone];
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

/**
 * Collapsible panel whose closed header still tells you what's set inside — so the
 * builder can start mostly collapsed without hiding state from you.
 */
export function Section({
  title,
  summary,
  count = 0,
  help,
  defaultOpen = false,
  onClear,
  children,
}: {
  title: string;
  summary: string;
  count?: number;
  help?: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-border bg-bg-panel/80">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="shrink-0 font-mono text-xs text-text-muted">{open ? "▾" : "▸"}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">{title}</span>
              {count > 0 && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
                  {count}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-text-muted">{summary}</span>
          </span>
        </button>
        {onClear && count > 0 && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t border-border p-4">
          {help && <p className="mb-3 text-xs text-text-muted">{help}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

/** Button row for small enums — every option stays visible instead of hiding in a dropdown. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex flex-wrap gap-1 rounded-md border border-border bg-bg p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.hint}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            value === option.value
              ? "bg-accent text-bg"
              : "text-text-muted hover:bg-bg-elevated hover:text-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Named presets in a dropdown, with a numeric field for anything not on the list. */
export function NumberChoice({
  value,
  presets,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: string;
  presets: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const isPreset = presets.some((p) => p.value === value);

  return (
    <div className="space-y-2">
      <Select
        value={isPreset ? value : "__custom"}
        onChange={(e) => onChange(e.target.value === "__custom" ? value || String(min ?? 1) : e.target.value)}
      >
        {presets.map((p) => (
          <option key={p.value || "none"} value={p.value}>
            {p.label}
          </option>
        ))}
        <option value="__custom">Custom value…</option>
      </Select>
      {!isPreset && (
        <TextInput
          type="number"
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/** Datetime picker that reads and writes the API's `YYYY-MM-DD HH:MM:SS` UTC strings. */
export function DateTimeField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <TextInput
      type="datetime-local"
      step={1}
      disabled={disabled}
      value={apiDateToInput(value)}
      onChange={(e) => onChange(inputDateToApi(e.target.value))}
    />
  );
}

/** Sticky action bar for a page's primary controls. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-border bg-bg/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
