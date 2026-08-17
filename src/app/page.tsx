"use client";

import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { SearchLoading } from "@/components/SearchLoading";
import { PreviewResults, QueryAlerts } from "@/components/PreviewResults";
import { SeescapeMark } from "@/components/SeescapeMark";
import { FilterChip } from "@/components/ui";
import { useQueryActions } from "@/components/useQueryActions";
import { useQueryStore } from "@/components/QueryStore";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import {
  QUERY_PRESETS,
  getSearchText,
  matchDatePreset,
  relativeDateRange,
  setSearchText,
} from "@/lib/query-form";
import { useT } from "@/lib/i18n/locale";

export default function SearchPage() {
  const router = useRouter();
  const t = useT();
  const { ready } = useQueryStore();
  const {
    form,
    lastPreview,
    setLastPreview,
    updateForm,
    runPreview,
    startExport,
    previewIssues,
    exportIssues,
    issues,
    busy,
    previewLoading,
    exportLoading,
    error,
    notice,
    showIssues,
  } = useQueryActions();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  const query = getSearchText(form);
  const activePreset = matchDatePreset(form);
  const hasResults = Boolean(lastPreview);
  const startHere = QUERY_PRESETS.filter((p) => p.category === "Start here");

  return (
    <div
      className={
        hasResults
          ? "mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8"
          : "flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-4 pb-20 pt-12 sm:min-h-screen sm:px-6 sm:pb-24 md:pt-0"
      }
    >
      <div className={`flex w-full flex-col items-center ${hasResults ? "items-stretch" : ""}`}>
        {!hasResults && (
          <div className="mb-6 sm:mb-8 text-center">
            <div className="flex justify-center">
              <SeescapeMark size="lg" showName />
            </div>
          </div>
        )}

        <SearchBar
          value={query}
          loading={previewLoading}
          autoFocus={!hasResults}
          onChange={(value) => updateForm(setSearchText(form, value))}
          onSubmit={() => void runPreview()}
          onAdvanced={() => router.push("/query")}
        />

        <div className={`mt-4 flex flex-wrap gap-2 ${hasResults ? "" : "justify-center"}`}>
          {DATE_RANGE_PRESETS.filter((p) => p.id !== "90d").map((preset) => (
            <FilterChip
              key={preset.id}
              selected={activePreset === preset.id}
              onClick={() => updateForm({ ...form, ...relativeDateRange(preset.days) })}
            >
              {t.datePresets[
                ({ "24h": "last24h", "7d": "last7d", "30d": "last30d", "90d": "last90d" } as const)[
                  preset.id
                ]
              ]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className={`w-full space-y-4 ${hasResults ? "" : "mt-10 max-w-2xl"}`}>
        <QueryAlerts
          showIssues={showIssues}
          issues={issues}
          previewIssues={previewIssues}
          exportIssues={exportIssues}
          notice={notice}
          error={error}
        />

        {previewLoading ? (
          <SearchLoading />
        ) : hasResults && lastPreview ? (
          <PreviewResults
            preview={lastPreview}
            onDismiss={() => setLastPreview(null)}
            onExport={() => void startExport()}
            exportLoading={exportLoading}
            exportDisabled={busy || exportIssues.length > 0}
            exportTitle={exportIssues.length ? exportIssues.join("; ") : t.query.exportHint}
          />
        ) : (
          !error && (
            <div className="w-full">
              <p className="mb-3 text-center text-xs text-text-subtle">{t.search.suggestions}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {startHere.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateForm(preset.apply(form));
                      setLastPreview(null);
                    }}
                    className="h-8 rounded-full border border-outline-variant/60 bg-surface/80 px-3.5 text-xs text-accent/80 transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent-on-soft"
                  >
                    {t.catalog.presetLabel[preset.id] ?? preset.label}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
