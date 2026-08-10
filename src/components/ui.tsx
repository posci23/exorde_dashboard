"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { apiDateToInput, inputDateToApi } from "@/lib/query-form";

/* Radii are fixed by the design system: controls 6px, cards 12px, pills full. */
const CONTROL = "rounded-md";  // 6px
const CARD = "rounded-xl";     // 12px

/*
 * For controls whose real <input> is visually hidden: the global :focus-visible
 * ring would draw around a 1px clipped box, so lift it onto the wrapper. `has-[]`
 * rather than `focus-within` keeps the design system's keyboard-only promise.
 */
const FOCUS_RING =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 " +
  "has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent-ring)]";

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

/**
 * Hover/focus explainer next to a field label. Keyboard-reachable, and the
 * bubble is width-capped so long explanations wrap instead of running off-screen.
 */
export function HelpIcon({ about, children }: { about?: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        // Every icon would otherwise announce the same thing; name it after the
        // field so a screen reader user knows which one they landed on.
        aria-label={about ? `More about: ${about}` : "More about this field"}
        aria-describedby={id}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-hover text-xs leading-none font-semibold text-text-subtle transition-colors hover:bg-accent-soft hover:text-accent"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs leading-relaxed font-normal text-text-muted opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}

/**
 * One-click choice list where each option needs a sentence of explanation —
 * the alternative to a dropdown whose labels can't carry that much meaning.
 */
export function RadioCards<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: {
  /** Names the group for screen readers; the visible label usually repeats it. */
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; description: string; badge?: string }>;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
  // Real <input type="radio"> rather than buttons with role="radio": arrow-key
  // navigation, group semantics and checked state all come for free and behave
  // the way a screen reader user expects.
  const name = useId();
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              className={`${CONTROL} block cursor-pointer border px-3.5 py-3 transition-colors ${FOCUS_RING} ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-bg hover:border-border-strong hover:bg-surface-hover"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={active}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border-[4px] transition-colors ${
                    active ? "border-accent-solid bg-bg" : "border-border-strong bg-bg"
                  }`}
                />
                <span className={`text-xs font-medium ${active ? "text-accent" : "text-text"}`}>
                  {option.label}
                </span>
                {option.badge && <Badge tone={active ? "accent" : "neutral"}>{option.badge}</Badge>}
              </span>
              <span className="mt-1.5 block pl-5.5 text-xs leading-relaxed text-text-muted">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FieldLabel({
  children,
  hint,
  help,
  htmlFor,
}: {
  children: ReactNode;
  hint?: ReactNode;
  help?: ReactNode;
  /** Only pass this when a single form control owns the label. */
  htmlFor?: string;
}) {
  // Without htmlFor a <label> announces a label that points at nothing, so the
  // neutral <span> is the honest element for composite widgets.
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-1.5">
        <Tag htmlFor={htmlFor} className="block text-xs font-medium text-text">
          {children}
        </Tag>
        {help && (
          <HelpIcon about={typeof children === "string" ? children : undefined}>{help}</HelpIcon>
        )}
      </div>
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
  helpLabel,
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
  /** Topic noun for the help link's label — titles are questions and read badly. */
  helpLabel?: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const linkText = `Read about ${helpLabel ?? title.toLowerCase()} in the Reference`;

  return (
    <section className={`${CARD} border border-border bg-surface transition-colors`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
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
              aria-label={linkText}
              title={linkText}
              className={`${CONTROL} flex h-7 w-7 items-center justify-center text-xs text-text-subtle transition-colors hover:bg-surface-hover hover:text-accent`}
            >
              ?
            </Link>
          )}
        </div>
      </div>
      {/* Always rendered so aria-controls resolves and inputs keep their state
          across a collapse; `hidden` keeps it out of layout and the a11y tree. */}
      <div id={panelId} hidden={!open} className="border-t border-border px-5 py-5">
        {help && <p className="mb-4 text-xs leading-relaxed text-text-muted">{help}</p>}
        {children}
      </div>
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
          aria-label={placeholder ? `Custom value in ${placeholder}` : "Custom value"}
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
