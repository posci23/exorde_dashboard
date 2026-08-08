"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryStore } from "@/components/QueryStore";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Panel, Select } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import type { ExportJobResponse, UserExportsResponse } from "@/lib/types";

export default function HistoryPage() {
  const { upsertJob } = useQueryStore();
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState<UserExportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<UserExportsResponse>(`/api/exorde/exports?limit=${limit}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    setData(res.data);
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncJob(jobId: string) {
    setSyncMsg(null);
    const res = await apiFetch<ExportJobResponse>("/api/exorde/sync", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    upsertJob(res.data);
    setSyncMsg(
      res.data.download_url
        ? `Synced ${jobId} — download available until ${res.data.download_expires_at ?? "expiry"}`
        : `Synced ${jobId} — status ${res.data.status}`,
    );
    if (res.data.download_url) {
      window.open(res.data.download_url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export History</h1>
          <p className="mt-1 text-sm text-text-muted">
            GET /api/v1/user/exports — last N jobs (max 100), newest first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select className="w-28" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      {error && <Alert tone="danger">{error}</Alert>}
      {syncMsg && <Alert tone="success">{syncMsg}</Alert>}

      <Panel
        title={data ? `User ${data.user_id}` : "Exports"}
        description={data ? `${data.total} jobs returned` : undefined}
      >
        {!data && !loading && (
          <p className="text-sm text-text-muted">No history loaded. Configure an API key and refresh.</p>
        )}
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-text-muted">
                <tr className="border-b border-border">
                  {["job_id", "type", "status", "created", "completed", "rows", "MB", "secs", ""].map(
                    (h) => (
                      <th key={h || "a"} className="px-2 py-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.exports.map((job) => (
                  <tr key={job.job_id} className="border-b border-border/50">
                    <td className="px-2 py-2 font-mono">{job.job_id}</td>
                    <td className="px-2 py-2">{job.job_type ?? "export"}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{job.created_at ?? "—"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{job.completed_at ?? "—"}</td>
                    <td className="px-2 py-2">{job.rows ?? job.rows_returned ?? "—"}</td>
                    <td className="px-2 py-2">{job.file_size_mb ?? "—"}</td>
                    <td className="px-2 py-2">{job.execution_time ?? job.execution_time_seconds ?? "—"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" onClick={() => void syncJob(job.job_id)}>
                          Sync
                        </Button>
                        <a href={`/export`}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              // store id for monitor via session
                              sessionStorage.setItem("exorde.monitorJobId", job.job_id);
                            }}
                          >
                            Open
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
