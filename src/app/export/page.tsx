"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QueryBuilder } from "@/components/QueryBuilder";
import { useQueryStore } from "@/components/QueryStore";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError, getDuplicateJobId } from "@/lib/browser-api";
import { EXPORT_PHASES } from "@/lib/constants";
import { buildQueryBody } from "@/lib/query-form";
import {
  queryBodySchema,
  type ExportCreateResponse,
  type ExportJobResponse,
  type QueueCapacityResponse,
} from "@/lib/types";

function isTerminal(status: string) {
  return ["completed", "failed", "rejected"].includes(status.toLowerCase());
}

export default function ExportPage() {
  const { form, setForm, trackedJobs, upsertJob, ready } = useQueryStore();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ExportJobResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const pollDelay = useRef(10_000);

  const pollOnce = useCallback(
    async (jobId: string) => {
      const res = await apiFetch<ExportJobResponse>(`/api/exorde/export/${encodeURIComponent(jobId)}`);
      if (!res.ok || !res.data) {
        setError(formatError(res.error));
        return null;
      }
      setJob(res.data);
      upsertJob(res.data);
      return res.data;
    },
    [upsertJob],
  );

  useEffect(() => {
    const fromHistory = sessionStorage.getItem("exorde.monitorJobId");
    if (fromHistory) {
      sessionStorage.removeItem("exorde.monitorJobId");
      setActiveJobId(fromHistory);
      setManualId(fromHistory);
    }
  }, []);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const data = await pollOnce(activeJobId!);
      if (cancelled || !data) return;
      if (isTerminal(data.status)) {
        pollDelay.current = 10_000;
        return;
      }
      // exponential-ish backoff after 30s of polling
      pollDelay.current = Math.min(pollDelay.current * 1.25, 30_000);
      timer = setTimeout(() => void tick(), pollDelay.current);
    }

    pollDelay.current = 10_000;
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJobId, pollOnce]);

  async function submitExport() {
    const body = buildQueryBody(form, "export");
    const parsed = queryBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const capacity = await apiFetch<QueueCapacityResponse>("/api/exorde/queue-capacity");
    if (capacity.ok && capacity.data && !capacity.data.accepting_new_jobs) {
      setError("Queue is not accepting new jobs (503 risk). Wait and retry.");
      setLoading(false);
      return;
    }

    const res = await apiFetch<ExportCreateResponse>("/api/exorde/export", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    setLoading(false);

    if (res.status === 409) {
      const existing = getDuplicateJobId(res.error);
      if (existing) {
        setMessage(`Duplicate export within 5 minutes — polling existing job ${existing}`);
        setActiveJobId(existing);
        return;
      }
    }

    if (res.status === 429) {
      const wait = res.retry_after_seconds ?? 60;
      setError(`Rate limited. Retry after ${wait}s. ${formatError(res.error)}`);
      return;
    }

    if (res.status === 503) {
      setError(`Queue saturated. ${formatError(res.error)} — backoff and check capacity.`);
      return;
    }

    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }

    setMessage(res.data.message);
    setActiveJobId(res.data.job_id);
    upsertJob({
      job_id: res.data.job_id,
      status: res.data.status,
      job_type: "export",
    });
  }

  if (!ready) return <p className="text-sm text-text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export Jobs</h1>
          <p className="mt-1 text-sm text-text-muted">
            Async export · handles 409 duplicates, 429 rate limits, and 503 queue saturation.
          </p>
        </div>
        <Button type="button" onClick={() => void submitExport()} disabled={loading}>
          {loading ? "Submitting…" : "Start export"}
        </Button>
      </header>

      {message && <Alert tone="info">{message}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      <Panel title="Job monitor" description="Polling 10s → backoff to 30s until terminal status">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="min-w-[280px] flex-1 rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            placeholder="Paste job_id to track"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (manualId.trim()) setActiveJobId(manualId.trim());
            }}
          >
            Track job
          </Button>
          {activeJobId && (
            <Button type="button" variant="ghost" onClick={() => void pollOnce(activeJobId)}>
              Poll now
            </Button>
          )}
        </div>

        {job ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Job ID" value={<span className="break-all text-sm">{job.job_id}</span>} />
              <Stat label="Status" value={<StatusBadge status={job.status} />} />
              <Stat label="Rows" value={job.rows_returned?.toLocaleString() ?? "—"} />
              <Stat label="Size" value={job.file_size_mb != null ? `${job.file_size_mb} MB` : "—"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Created" value={<span className="text-sm">{job.created_at ?? "—"}</span>} />
              <Stat label="Completed" value={<span className="text-sm">{job.completed_at ?? "—"}</span>} />
              <Stat
                label="Execution"
                value={job.execution_time_seconds != null ? `${job.execution_time_seconds}s` : "—"}
              />
            </div>
            {job.error_message && <Alert tone="danger">{job.error_message}</Alert>}
            {job.download_url && (
              <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                <div className="text-sm text-success">Download ready</div>
                <div className="mt-1 text-xs text-text-muted">
                  Expires: {job.download_expires_at ?? "48h from completion"} · no auth required
                </div>
                <a
                  href={job.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg"
                >
                  Download file
                </a>
              </div>
            )}
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Processing phases</div>
              <div className="flex flex-wrap gap-2">
                {EXPORT_PHASES.map((phase, i) => {
                  const done =
                    job.status === "completed" ||
                    (job.status === "running" && i < 5) ||
                    (job.status === "pending" && i < 1);
                  return (
                    <span
                      key={phase}
                      className={`rounded-md border px-2 py-1 text-[11px] ${
                        done
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border text-text-muted"
                      }`}
                    >
                      {i + 1}. {phase}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No active job yet. Submit an export or paste a job_id.</p>
        )}
      </Panel>

      {trackedJobs.length > 0 && (
        <Panel title="Tracked this session">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">job_id</th>
                  <th className="py-2 pr-3">status</th>
                  <th className="py-2 pr-3">rows</th>
                  <th className="py-2">actions</th>
                </tr>
              </thead>
              <tbody>
                {trackedJobs.map((j) => (
                  <tr key={j.job_id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-mono">{j.job_id}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="py-2 pr-3">{j.rows_returned ?? j.rows ?? "—"}</td>
                    <td className="py-2">
                      <Button type="button" variant="ghost" onClick={() => setActiveJobId(j.job_id)}>
                        Monitor
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <QueryBuilder form={form} onChange={setForm} mode="export" />
    </div>
  );
}
