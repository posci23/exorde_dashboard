"use client";

import { Icon } from "./icons";
import { SearchSpinner } from "./SearchLoading";
import { useT } from "@/lib/i18n/locale";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAdvanced: () => void;
  loading?: boolean;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChange, onSubmit, onAdvanced, loading, autoFocus }: Props) {
  const t = useT();

  return (
    <form
      className="w-full max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex h-14 items-center rounded-full border border-outline-variant/70 bg-surface/90 pl-1 pr-1 shadow-[var(--shadow-1)] backdrop-blur-sm transition-[background-color,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-within:border-accent/40 focus-within:bg-surface focus-within:shadow-[var(--shadow-2)]">
        <button
          type="submit"
          className="icon-btn"
          aria-label={loading ? t.search.searching : t.search.submit}
          aria-busy={loading || undefined}
          disabled={loading}
        >
          {loading ? <SearchSpinner /> : <Icon name="search" />}
        </button>
        <input
          type="search"
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-label={t.search.placeholder}
          placeholder={t.search.placeholder}
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-subtle"
        />
        {value ? (
          <button
            type="button"
            className="icon-btn"
            aria-label={t.common.clear}
            onClick={() => onChange("")}
          >
            <Icon name="close" />
          </button>
        ) : null}
        <button
          type="button"
          className="icon-btn"
          aria-label={t.search.advanced}
          title={t.search.advancedHint}
          onClick={onAdvanced}
        >
          <Icon name="tune" />
        </button>
      </div>
    </form>
  );
}
