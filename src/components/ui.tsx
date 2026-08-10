"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { apiDateToInput, inputDateToApi } from "@/lib/query-form";

/* Radii are fixed by the design system: controls 6px, cards 12px, pills full. */
const CONTROL = "rounded-md";  // 6px
const CARD = "rounded-xl";     // 12px

const FIELD_BASE =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text " +
  "placeholder:text-text-subtle outline-none transition-colors hover:border-border-strong " +
  "focus:border-accent disabled:cursor-not-allowed disabled:opacity-50";

/** A card. `title` is optional so it can also be a plain container. */
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
    <section className={`${CARD} border border-border bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
            {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={title || actions ? "px-5 pb-5" : "p-5"}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div className={`${CARD} border border-border bg-surface px-4 py-3.5`}>
      <div className="label-caps">{label}</div>
      <div
        className={`tnum mt-1.5 text-xl font-medium ${tone === "accent" ? "text-accent" : "text-text"}`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    primary: "bg-accent-solid text-accent-fg hover:bg-accent-hover",
    secondary: "border border-border-strong bg-surface-raised text-text hover:bg-surface-hover",
    ghost: "text-text-muted hover:bg-surface-hover hover:text-text",
    danger: "border border-danger/30 bg-transparent text-danger hover:bg-danger/10",
  }[variant];

  const sizes = { sm: "h-7 px-2.5 text-xs", md: "h-9 px-3.5 text-sm" }[size];

  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 ${CONTROL} font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${variants} ${sizes} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label className="text-xs font-medium text-text">{children}</label>
      {hint && <span className="font-mono text-xs text-text-subtle">{hint}</span>}
    </div>
  );
}

export function TextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_BASE} ${className}`} />;
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD_BASE} resize-y font-mono text-xs ${className}`} />;
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD_BASE} cursor-pointer pr-8 ${className}`} />;
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const styles = {
    info: "border-info/25 bg-info/[0.07] text-info",
    success: "border-success/25 bg-success/[0.07] text-success",
    warning: "border-warning/25 bg-warning/[0.07] text-warning",
    danger: "border-danger/25 bg-danger/[0.07] text-danger",
  }[tone];
  return <div className={`${CONTROL} border px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>;
}

/** Small count/state pill. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-surface-hover text-text-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-info/10 text-info",
  }[tone];
  return (
    <span
      className={`tnum inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

/**
 * Collapsible card whose closed header still reports what's set inside, so the
 * builder can start mostly collapsed without hiding state.
 */
export function Section({
  title,
  summary,
  count = 0,
  help,
  helpHref,
  defaultOpen = false,
  onClear,
  children,
}: {
  title: string;
  summary: string;
  count?: number;
  help?: string;
  /** Deep link into the Reference page for this filter group. */
  helpHref?: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${CARD} border border-border bg-surface transition-colors`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={`shrink-0 text-text-subtle transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ›
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">{title}</span>
              {count > 0 && <Badge tone="accent">{count}</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-xs text-text-muted">{summary}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {onClear && count > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
          {helpHref && (
            <Link
              href={helpHref}
              title={`Read about ${title.toLowerCase()} in the Reference`}
              className={`${CONTROL} flex h-7 w-7 items-center justify-center text-xs text-text-subtle transition-colors hover:bg-surface-hover hover:text-accent`}
            >
              ?
            </Link>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-border px-5 py-5">
          {help && <p className="mb-4 text-xs leading-relaxed text-text-muted">{help}</p>}
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
    <div
      role="radiogroup"
      className={`inline-flex flex-wrap gap-0.5 ${CONTROL} border border-border bg-bg p-0.5 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          title={option.hint}
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-accent-solid text-accent-fg"
              : "text-text-muted hover:bg-surface-hover hover:text-text"
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
        onChange={(e) =>
          onChange(e.target.value === "__custom" ? value || String(min ?? 1) : e.target.value)
        }
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
      className="font-mono text-xs [color-scheme:dark]"
      value={apiDateToInput(value)}
      onChange={(e) => onChange(inputDateToApi(e.target.value))}
    />
  );
}

/** Sticky action bar for a page's primary controls. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-8 mb-2 border-b border-border bg-bg/85 px-8 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Page title block, used identically on every page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Empty state with an optional call to action. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={`${CONTROL} border border-dashed border-border px-4 py-8 text-center`}>
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}
