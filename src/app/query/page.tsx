"use client";

import Link from "next/link";
import { QueryBuilder } from "@/components/QueryBuilder";
import { PreviewResults, QueryAlerts, QueryRunActions } from "@/components/PreviewResults";
import { useQueryStore } from "@/components/QueryStore";
import { PageHeader, PageShell, Select, Toolbar } from "@/components/ui";
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
  } = useQueryActions();

  if (!ready) return <PageShell><p className="text-sm text-text-muted">{t.common.loading}</p></PageShell>;

  const presetsByCategory = [...new Set(QUERY_PRESETS.map((p) => p.category))];

  return (
    <PageShell className="space-y-5">
      <Toolbar>
        <div className="w-full max-w-xs sm:max-w-sm">
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

      <QueryBuilder form={form} onChange={updateForm} />

      <QueryAlerts
        issues={issues}
        previewIssues={previewIssues}
        exportIssues={exportIssues}
        notice={notice}
        error={error}
      />

      <QueryRunActions
        previewIssues={previewIssues}
        exportIssues={exportIssues}
        busy={busy}
        previewLoading={previewLoading}
        exportLoading={exportLoading}
        onPreview={() => void runPreview()}
        onExport={() => void startExport()}
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

    </PageShell>
  );
}
