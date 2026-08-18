"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { apiDateToInput, inputDateToApi } from "@/lib/query-form";
import { useT } from "@/lib/i18n/locale";

const CONTROL = "rounded-lg";
const CARD = "rounded-xl";

const FOCUS_RING =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 " +
  "has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]";

const FIELD_BASE =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-text " +
  "placeholder:text-text-subtle outline-none transition-colors hover:border-outline " +
  "focus:border-accent disabled:cursor-not-allowed disabled:opacity-50";

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 ${className}`}>{children}</div>;
}

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
    <section className={`${CARD} border border-outline-variant/40 bg-surface/80 backdrop-blur-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-medium text-text">{title}</h2>}
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
    <div className={`${CARD} border border-outline-variant/40 bg-surface/80 px-4 py-3.5 backdrop-blur-sm`}>
      <div className="label-caps">{label}</div>
      <div className={`tnum mt-1.5 text-xl font-medium ${tone === "accent" ? "text-text" : "text-text"}`}>
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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "tonal";
  size?: "sm" | "md";
}) {
  const variants = {
    primary: "bg-accent-solid text-accent-fg hover:bg-accent-hover",
    secondary: "border border-accent/25 bg-surface/80 text-accent hover:bg-accent-soft hover:text-accent-on-soft",
    tonal: "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent-on-soft",
    ghost: "text-accent/80 hover:bg-accent-soft/60 hover:text-accent-on-soft",
    danger: "text-danger hover:bg-danger/10",
  }[variant];

  // Touch pointers get Material's larger target; mouse pointers keep the
  // denser sizing the rest of the console uses.
  const sizes = {
    sm: "h-8 pointer-coarse:h-10 px-3 pointer-coarse:px-4 text-xs",
    md: "h-10 pointer-coarse:h-11 px-5 text-sm",
  }[size];

  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 ${variants} ${sizes} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function HelpIcon({
  about,
  children,
  /**
   * Anchor the bubble to the whole label row instead of the icon. On a narrow
   * phone a bubble anchored to the icon runs off the side; anchored to the row
   * it can never be wider than the row it sits in.
   */
  anchorToRow = false,
}: {
  about?: string;
  children: ReactNode;
  anchorToRow?: boolean;
}) {
  const id = useId();
  const t = useT();
  return (
    <span className={`group inline-flex ${anchorToRow ? "static sm:relative" : "relative"}`}>
      <button
        type="button"
        aria-label={about ? t.ui.helpAria(about) : t.ui.helpAriaGeneric}
        aria-describedby={id}
        /*
         * The dot stays small; the *target* does not. On a touch pointer a
         * pseudo-element widens the hit area to Material's 48dp without
         * moving anything on the page.
         */
        className="relative flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-container-high text-xs leading-none font-semibold text-text-subtle transition-colors hover:bg-surface-container-highest hover:text-text pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:absolute pointer-coarse:before:-inset-2.5 pointer-coarse:before:content-['']"
      >
        ?
      </button>
      {/*
        `hidden`, not `invisible`: a hidden-but-laid-out bubble still counts
        toward the document's width, which is enough to give a 360px phone a
        horizontal scrollbar before anyone has hovered anything.
      */}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden rounded-xl bg-surface-container-low px-3 py-2 text-xs leading-relaxed font-normal text-text-muted shadow-[var(--shadow-2)] group-hover:block group-focus-within:block sm:left-1/2 sm:w-64 sm:-translate-x-1/2 ${
          anchorToRow ? "left-0 w-full" : "left-0 w-[min(16rem,calc(100vw-2.5rem))]"
        }`}
      >
        {children}
      </span>
    </span>
  );
}

export function RadioCards<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; description: string; badge?: string }>;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
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
              className={`${CONTROL} block cursor-pointer px-3.5 py-3 transition-colors ${FOCUS_RING} ${
                active
                  ? "bg-accent-soft"
                  : "bg-surface-container-low hover:bg-surface-container-high"
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
                    active ? "border-accent-solid bg-surface" : "border-outline bg-surface"
                  }`}
                />
                <span className={`text-xs font-medium ${active ? "text-accent-on-soft" : "text-text"}`}>
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
  htmlFor?: string;
}) {
  const Tag = htmlFor ? "label" : "span";
  return (
    // Positioned so a help bubble can anchor to the row on small screens.
    <div className="relative mb-2 flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-1.5">
        <Tag htmlFor={htmlFor} className="block text-xs font-medium text-text">
          {children}
        </Tag>
        {help && (
          <HelpIcon anchorToRow about={typeof children === "string" ? children : undefined}>
            {help}
          </HelpIcon>
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
    info: "bg-surface-container-high text-text",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  }[tone];
  return <div className={`${CARD} px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-surface-container-high text-text-muted",
    accent: "bg-accent-soft text-accent-on-soft",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-surface-container-high text-text-muted",
  }[tone];
  return (
    <span className={`tnum inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

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
  helpHref?: string;
  helpLabel?: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const t = useT();
  const linkText = t.ui.readAbout(helpLabel ?? title.toLowerCase());

  return (
    <section className={`${CARD} border border-outline-variant/40 bg-surface/80 backdrop-blur-sm`}>
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
              <span className="text-sm font-medium text-text">{title}</span>
              {count > 0 && <Badge tone="accent">{count}</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-xs text-text-muted">{summary}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {onClear && count > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              {t.common.clear}
            </Button>
          )}
          {helpHref && (
            <Link
              href={helpHref}
              aria-label={linkText}
              title={linkText}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-text-subtle transition-colors hover:bg-surface-hover hover:text-text"
            >
              ?
            </Link>
          )}
        </div>
      </div>
      <div id={panelId} hidden={!open} className="border-t border-outline-variant/50 px-5 py-5">
        {help && <p className="mb-4 text-xs leading-relaxed text-text-muted">{help}</p>}
        {children}
      </div>
    </section>
  );
}

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
      className={`inline-flex flex-wrap gap-0.5 rounded-full border border-outline-variant/50 bg-surface/80 p-0.5 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          title={option.hint}
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-10 pointer-coarse:px-4 ${
            value === option.value
              ? "bg-accent-solid text-accent-fg"
              : "text-accent/70 hover:bg-accent-soft/50 hover:text-accent-on-soft"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

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
  const t = useT();

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
        <option value="__custom">{t.ui.customValue}</option>
      </Select>
      {!isPreset && (
        <TextInput
          type="number"
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          aria-label={placeholder ? t.ui.customValueAria(placeholder) : t.ui.customValueAriaPlain}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

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
      className="font-mono text-xs [color-scheme:light]"
      value={apiDateToInput(value)}
      onChange={(e) => onChange(inputDateToApi(e.target.value))}
    />
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    // The bleed has to match PageShell's padding, which is 4 on phones and 6
    // from sm up; a flat -mx-6 overflowed the viewport on a narrow screen.
    <div className="sticky top-0 z-20 -mx-4 mb-2 bg-bg/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

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
        <h1 className="text-[1.75rem] font-normal tracking-tight text-accent">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={`${CARD} border border-dashed border-accent/25 bg-surface/60 px-4 py-10 text-center backdrop-blur-sm`}>
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}

export function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-8 rounded-full px-3.5 text-xs font-medium transition-colors pointer-coarse:h-11 pointer-coarse:px-4 ${
        selected
          ? "bg-accent-solid text-accent-fg shadow-[var(--shadow-1)]"
          : "border border-outline-variant/60 bg-surface/80 text-accent/75 hover:border-accent/30 hover:bg-accent-soft hover:text-accent-on-soft"
      }`}
    >
      {children}
    </button>
  );
}
