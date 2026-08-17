"use client";

import { Fragment, useState } from "react";
import { SampleCharts } from "./SampleCharts";
import { Alert, Button, Panel, Stat } from "./ui";
import { useT } from "@/lib/i18n/locale";
import type { PreviewResponse, SamplePost } from "@/lib/types";

export function PreviewResults({
  preview,
  onDismiss,
  onExport,
  exportLoading,
  exportDisabled,
  exportTitle,
  showExport = true,
}: {
  preview: PreviewResponse;
  onDismiss: () => void;
  onExport: () => void;
  exportLoading: boolean;
  exportDisabled: boolean;
  exportTitle?: string;
  showExport?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-medium text-text">{t.query.previewResult}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onDismiss}>
            {t.common.dismiss}
          </Button>
          {showExport && (
            <Button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              title={exportTitle}
            >
              {exportLoading ? t.query.submitting : t.query.startExport}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t.query.matchingPosts}
          value={preview.count.toLocaleString()}
          hint={t.query.matchingPostsHint}
        />
        <Stat label={t.query.queryTime} value={`${preview.query_time_seconds}s`} />
        <Stat label={t.query.estSize} value={`${preview.estimated_export_size_mb} MB`} />
      </div>

      <SampleCharts samples={preview.sample ?? []} />

      <Panel title={t.query.sampleRows(preview.sample?.length ?? 0)} description={t.query.sampleRowsHint}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="text-text-muted">
              <tr className="border-b border-outline-variant">
                {[t.query.colPosted, t.query.colPlatform, t.query.colLang, t.query.colSentiment, t.query.colContent, ""].map(
                  (h) => (
                    <th scope="col" key={h || "actions"} className="px-2 py-2 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(preview.sample ?? []).map((row: SamplePost, i) => {
                const id = String(row.external_id ?? i);
                return (
                  <Fragment key={id}>
                    <tr className="border-b border-outline-variant/60 align-top">
                      <td className="whitespace-nowrap px-2 py-2 font-mono">{row.created_at ?? "—"}</td>
                      <td className="px-2 py-2">{row.domain ?? "—"}</td>
                      <td className="px-2 py-2">{row.language ?? "—"}</td>
                      <td className="px-2 py-2 font-mono">
                        {typeof row.analysis_sentiment === "number" ? row.analysis_sentiment.toFixed(2) : "—"}
                      </td>
                      <td className="max-w-md px-2 py-2 text-text-muted">
                        {(row.raw_content ?? "").slice(0, 160)}
                        {(row.raw_content?.length ?? 0) > 160 ? "…" : ""}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpanded(expanded === id ? null : id)}
                        >
                          {expanded === id ? t.query.hide : "JSON"}
                        </Button>
                      </td>
                    </tr>
                    {expanded === id && (
                      <tr>
                        <td colSpan={6} className="bg-surface-container-low px-2 py-2">
                          <pre className="overflow-auto font-mono text-xs text-text-muted">
                            {JSON.stringify(row, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <details>
        <summary className="cursor-pointer text-xs text-text-muted underline decoration-outline-variant underline-offset-2 hover:text-text">
          {t.query.filtersApplied}
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-surface-container-low p-3 font-mono text-xs text-text-muted">
          {JSON.stringify(preview.filters_applied, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function QueryAlerts({
  showIssues,
  issues,
  previewIssues,
  exportIssues,
  notice,
  error,
}: {
  showIssues: boolean;
  issues: string[];
  previewIssues: string[];
  exportIssues: string[];
  notice: string | null;
  error: string | null;
}) {
  const t = useT();
  return (
    <>
      {showIssues && issues.length > 0 && (
        <Alert tone="warning">
          <ul className="list-inside list-disc space-y-0.5">
            {issues.map((issue) => {
              const scope = !exportIssues.includes(issue)
                ? t.query.previewOnly
                : !previewIssues.includes(issue)
                  ? t.query.exportOnly
                  : null;
              return (
                <li key={issue}>
                  {issue}
                  {scope && <span className="ml-1.5 text-text-subtle">({scope})</span>}
                </li>
              );
            })}
          </ul>
        </Alert>
      )}
      {notice && <Alert>{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
    </>
  );
}
