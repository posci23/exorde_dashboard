"use client";

import Link from "next/link";
import { QueryBuilder } from "@/components/QueryBuilder";
import { PreviewResults, QueryAlerts } from "@/components/PreviewResults";
import { useQueryStore } from "@/components/QueryStore";
import { Button, PageHeader, PageShell, Select, Toolbar } from "@/components/ui";
import { useQueryActions } from "@/components/useQueryActions";
import { QUERY_PRESETS } from "@/lib/query-form";
import { useT } from "@/lib/i18n/locale";

export default function QueryPage() {
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
    setNotice,
    showIssues,
    setShowIssues,
  } = useQueryActions();

  if (!ready) return <PageShell><p className="text-sm text-text-muted">{t.common.loading}</p></PageShell>;

  const presetsByCategory = [...new Set(QUERY_PRESETS.map((p) => p.category))];

  return (
    <PageShell className="space-y-5">
      <Toolbar>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="w-60">
            <Select
              value=""
              onChange={(e) => {
                const preset = QUERY_PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  updateForm(preset.apply(form));
                  setNotice(
                    t.query.loadedPreset(
                      t.catalog.presetLabel[preset.id] ?? preset.label,
                      t.catalog.presetDesc[preset.id] ?? preset.description,
                    ),
                  );
                }
              }}
            >
              <option value="">{t.query.examples}</option>
              {presetsByCategory.map((category) => (
                <optgroup key={category} label={t.catalog.presetCategory[category] ?? category}>
                  {QUERY_PRESETS.filter((p) => p.category === category).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {t.catalog.presetLabel[preset.id] ?? preset.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIssues((v) => !v)}
            disabled={!issues.length}
            title={issues.length ? t.query.showIssues : t.query.queryReady}
            className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
              issues.length
                ? "bg-warning/10 text-warning hover:bg-warning/15"
                : "bg-success/10 text-success"
            }`}
          >
            {issues.length ? t.query.issues(issues.length) : t.query.valid}
          </button>
          <Button
            type="button"
            variant="tonal"
            onClick={() => void runPreview()}
            disabled={busy || previewIssues.length > 0}
            title={previewIssues.length ? previewIssues.join("; ") : t.query.previewHint}
          >
            {previewLoading ? t.query.previewing : t.query.preview}
          </Button>
          <Button
            type="button"
            onClick={() => void startExport()}
            disabled={busy || exportIssues.length > 0}
            title={exportIssues.length ? exportIssues.join("; ") : t.query.exportHint}
          >
            {exportLoading ? t.query.submitting : t.query.startExport}
          </Button>
        </div>
      </Toolbar>

      <PageHeader
        title={t.query.title}
        description={t.query.description}
        actions={
          <Link
            href="/reference?tab=filters"
            className="inline-flex h-10 items-center rounded-full border border-accent/25 bg-surface/80 px-5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft hover:text-accent-on-soft"
          >
            {t.query.openReference}
          </Link>
        }
      />

      <QueryAlerts
        showIssues={showIssues}
        issues={issues}
        previewIssues={previewIssues}
        exportIssues={exportIssues}
        notice={notice}
        error={error}
      />

      {lastPreview && (
        <PreviewResults
          preview={lastPreview}
          onDismiss={() => setLastPreview(null)}
          onExport={() => void startExport()}
          exportLoading={exportLoading}
          exportDisabled={busy || exportIssues.length > 0}
          exportTitle={exportIssues.length ? exportIssues.join("; ") : t.query.exportHint}
          showExport={false}
        />
      )}

      <QueryBuilder form={form} onChange={updateForm} />
    </PageShell>
  );
}
