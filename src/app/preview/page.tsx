"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { QueryBuilder } from "@/components/QueryBuilder";
import { useQueryStore } from "@/components/QueryStore";
import { SampleCharts } from "@/components/SampleCharts";
import { Alert, Button, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { buildQueryBody } from "@/lib/query-form";
import { queryBodySchema, type PreviewResponse, type SamplePost } from "@/lib/types";

export default function PreviewPage() {
  const { form, setForm, lastPreview, setLastPreview, ready } = useQueryStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function runPreview() {
    const body = buildQueryBody(form, "preview");
    const parsed = queryBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }

    setLoading(true);
    setError(null);
    const res = await apiFetch<PreviewResponse>("/api/exorde/preview", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);

    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    setLastPreview(res.data);
  }

  if (!ready) return <p className="text-sm text-text-muted">Loading saved query…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Query / Preview</h1>
          <p className="mt-1 text-sm text-text-muted">
            Free synchronous preview — count, size estimate, and 100 sample rows. No quota consumed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void runPreview()} disabled={loading}>
            {loading ? "Running preview…" : "Run preview"}
          </Button>
          <Link href="/export">
            <Button type="button" variant="secondary">
              Continue to export
            </Button>
          </Link>
        </div>
      </header>

      {error && <Alert tone="danger">{error}</Alert>}

      {lastPreview && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Match count" value={lastPreview.count.toLocaleString()} />
            <Stat label="Query time" value={`${lastPreview.query_time_seconds}s`} />
            <Stat label="Est. export size" value={`${lastPreview.estimated_export_size_mb} MB`} />
          </div>
          <SampleCharts samples={lastPreview.sample ?? []} />
          <Panel title="Filters applied" description="Echoed by the API">
            <pre className="max-h-64 overflow-auto font-mono text-[11px] text-text-muted">
              {JSON.stringify(lastPreview.filters_applied, null, 2)}
            </pre>
          </Panel>
          <Panel title={`Sample rows (${lastPreview.sample?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead className="text-text-muted">
                  <tr className="border-b border-border">
                    {["created_at", "domain", "language", "sentiment", "content", ""].map((h) => (
                      <th key={h || "actions"} className="px-2 py-2 font-medium">
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
                          <td className="whitespace-nowrap px-2 py-2 font-mono">{row.created_at ?? "—"}</td>
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
                              onClick={() => setExpanded(expanded === id ? null : id)}
                            >
                              JSON
                            </Button>
                          </td>
                        </tr>
                        {expanded === id && (
                          <tr>
                            <td colSpan={6} className="bg-bg px-2 py-2">
                              <pre className="overflow-auto font-mono text-[11px] text-text-muted">
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
        </>
      )}

      <QueryBuilder form={form} onChange={setForm} mode="preview" />
    </div>
  );
}
