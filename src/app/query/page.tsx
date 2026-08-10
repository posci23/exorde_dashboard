"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryBuilder } from "@/components/QueryBuilder";
import { useQueryStore } from "@/components/QueryStore";
import { SampleCharts } from "@/components/SampleCharts";
import { Alert, Button, PageHeader, Panel, Select, Stat, Toolbar } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { describeIssues, submitExport, validateQuery } from "@/lib/export-actions";
import { QUERY_PRESETS, buildQueryBody } from "@/lib/query-form";
import type { PreviewResponse, SamplePost } from "@/lib/types";

export default function QueryPage() {
  const router = useRouter();
  const { form, setForm, lastPreview, setLastPreview, upsertJob, ready } = useQueryStore();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);

  // The two bodies validate differently: preview drops the export-only row caps,
  // so a long range that a per-day cap makes legal for export is still too wide
  // to preview. Each button therefore reads its own verdict.
  const previewIssues = describeIssues(validateQuery(buildQueryBody(form, "preview")));
  const exportIssues = describeIssues(validateQuery(buildQueryBody(form, "export")));
  const issues = [...new Set([...exportIssues, ...previewIssues])];
  const busy = previewLoading || exportLoading;

  async function runPreview() {
    const parsed = validateQuery(buildQueryBody(form, "preview"));
    if (!parsed.success) {
      setError(`Can't preview this query: ${describeIssues(parsed).join("; ")}`);
      setShowIssues(true);
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setNotice(null);
    const res = await apiFetch<PreviewResponse>("/api/exorde/preview", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    setPreviewLoading(false);

    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    setLastPreview(res.data);
  }

  async function startExport() {
    const parsed = validateQuery(buildQueryBody(form, "export"));
    if (!parsed.success) {
      setError(`Can't export this query: ${describeIssues(parsed).join("; ")}`);
      setShowIssues(true);
      return;
    }

    setExportLoading(true);
    setError(null);
    setNotice(null);
    const result = await submitExport(parsed.data);
    setExportLoading(false);

    if (result.kind === "error") {
      setError(result.message);
      return;
    }

    if (result.kind === "created") {
      upsertJob({
        job_id: result.jobId,
        status: "pending",
        job_type: "export",
      });
    }
    router.push(`/jobs?job=${encodeURIComponent(result.jobId)}`);
  }

  if (!ready) return <p className="text-sm text-text-muted">Loading saved query…</p>;

  const presetsByCategory = [...new Set(QUERY_PRESETS.map((p) => p.category))];

  return (
    <div className="space-y-5">
      <Toolbar>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="w-60">
            <Select
              value=""
              onChange={(e) => {
                const preset = QUERY_PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  setForm(preset.apply(form));
                  setNotice(`Loaded preset “${preset.label}” — ${preset.description}`);
                }
              }}
            >
              <option value="">Example queries…</option>
              {presetsByCategory.map((category) => (
                <optgroup key={category} label={category}>
                  {QUERY_PRESETS.filter((p) => p.category === category).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
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
            title={issues.length ? "Show what needs fixing" : "This query is ready to run"}
            className={`h-9 rounded-md px-3 text-xs font-medium transition-colors ${
              issues.length
                ? "bg-warning/10 text-warning hover:bg-warning/15"
                : "bg-success/10 text-success"
            }`}
          >
            {issues.length ? `${issues.length} issue${issues.length > 1 ? "s" : ""}` : "✓ Valid"}
          </button>
          <Button
            type="button"
            onClick={() => void runPreview()}
            disabled={busy || previewIssues.length > 0}
            title={previewIssues.length ? previewIssues.join("; ") : "Sample this query for free"}
          >
            {previewLoading ? "Previewing…" : "Preview (free)"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void startExport()}
            disabled={busy || exportIssues.length > 0}
            title={exportIssues.length ? exportIssues.join("; ") : "Run the full export"}
          >
            {exportLoading ? "Submitting…" : "Start export"}
          </Button>
        </div>
      </Toolbar>

      <PageHeader
        title="Query"
        description="Answer as many of the questions below as you need — every one is optional except a keyword or an author. Preview is free and instant; export runs the same query in full and lands in Jobs. Hover any ? for an explanation."
      />

      {showIssues && issues.length > 0 && (
        <Alert tone="warning">
          <ul className="list-inside list-disc space-y-0.5">
            {issues.map((issue) => {
              // An issue can block one action and not the other, so say which.
              const scope = !exportIssues.includes(issue)
                ? "Preview only"
                : !previewIssues.includes(issue)
                  ? "Export only"
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
      {notice && <Alert tone="info">{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      {lastPreview && (
        <div className="space-y-4 rounded-xl border border-accent/20 bg-accent-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text">Preview result</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLastPreview(null)}>
              Dismiss
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Matching posts"
              value={lastPreview.count.toLocaleString()}
              hint="Full export row count"
            />
            <Stat label="Query time" value={`${lastPreview.query_time_seconds}s`} />
            <Stat label="Est. export size" value={`${lastPreview.estimated_export_size_mb} MB`} />
          </div>
          <SampleCharts samples={lastPreview.sample ?? []} />
          <Panel
            title={`Sample rows (${lastPreview.sample?.length ?? 0})`}
            description="Free sample — the export returns all matching rows"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead className="text-text-muted">
                  <tr className="border-b border-border">
                    {["Posted", "Platform", "Lang", "Sentiment", "Content", ""].map((h) => (
                      <th scope="col" key={h || "actions"} className="px-2 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(lastPreview.sample ?? []).map((row: SamplePost, i) => {
                    const id = String(row.external_id ?? i);
                    return (
                      <Fragment key={id}>
                        <tr className="border-b border-border/60 align-top">
                          <td className="whitespace-nowrap px-2 py-2 font-mono">
                            {row.created_at ?? "—"}
                          </td>
                          <td className="px-2 py-2">{row.domain ?? "—"}</td>
                          <td className="px-2 py-2">{row.language ?? "—"}</td>
                          <td className="px-2 py-2 font-mono">
                            {typeof row.analysis_sentiment === "number"
                              ? row.analysis_sentiment.toFixed(2)
                              : "—"}
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
                              {expanded === id ? "Hide" : "JSON"}
                            </Button>
                          </td>
                        </tr>
                        {expanded === id && (
                          <tr>
                            <td colSpan={6} className="bg-bg px-2 py-2">
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
            <summary className="cursor-pointer text-xs text-accent">
              Filters the API applied
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-text-muted">
              {JSON.stringify(lastPreview.filters_applied, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <QueryBuilder form={form} onChange={setForm} />
    </div>
  );
}
