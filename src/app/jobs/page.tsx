"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryStore } from "@/components/QueryStore";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  SegmentedControl,
  Select,
  Stat,
  TextInput,
} from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { EXPORT_PHASES, LIMITS } from "@/lib/constants";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { ExportJobResponse, UserExportsResponse } from "@/lib/types";

const TERMINAL = ["completed", "failed", "rejected"];

function isTerminal(status: string) {
  return TERMINAL.includes(status.toLowerCase());
}

/** How far through the 7 documented phases a job is, given only its coarse status. */
function phasesDone(status: string): number {
  const s = status.toLowerCase();
  if (s === "completed") return EXPORT_PHASES.length;
  if (s === "running") return 5;
  if (s === "validated") return 2;
  if (s === "pending") return 1;
  return 0;
}

export default function JobsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <JobsView />
    </Suspense>
  );
}

function JobsView() {
  const searchParams = useSearchParams();
  const { trackedJobs, upsertJob, clearJobs, ready } = useQueryStore();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ExportJobResponse | null>(null);
  const [manualId, setManualId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<"session" | "history">("session");
  const [limit, setLimit] = useState<number>(LIMITS.historyLimitDefault);
  const [history, setHistory] = useState<UserExportsResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const pollDelay = useRef(10_000);

  const pollOnce = useCallback(
    async (jobId: string) => {
      const res = await apiFetch<ExportJobResponse>(`/api/exorde/export/${encodeURIComponent(jobId)}`);
      if (!res.ok || !res.data) {
        setError(formatError(res.error));
        return null;
      }
      setError(null);
      setJob(res.data);
      upsertJob(res.data);
      return res.data;
    },
    [upsertJob],
  );

  // A ?job= param (set when an export is submitted from /query) starts the monitor.
  useEffect(() => {
    const fromUrl = searchParams.get("job");
    if (fromUrl) {
      setActiveJobId(fromUrl);
      setManualId(fromUrl);
    }
  }, [searchParams]);

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const res = await apiFetch<UserExportsResponse>(`/api/exorde/exports?limit=${limit}`);
    setHistoryLoading(false);
    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    setHistory(res.data);
  }, [limit]);

  useEffect(() => {
    if (tab === "history") void loadHistory();
  }, [tab, loadHistory]);

  async function syncJob(jobId: string) {
    setNotice(null);
    const res = await apiFetch<ExportJobResponse>("/api/exorde/sync", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    upsertJob(res.data);
    setJob(res.data);
    setActiveJobId(jobId);
    setNotice(
      res.data.download_url
        ? `Synced ${jobId} — download link refreshed (valid until ${res.data.download_expires_at ?? "expiry"}).`
        : `Synced ${jobId} — status is ${res.data.status}.`,
    );
  }

  if (!ready) return <p className="text-sm text-text-muted">Loading…</p>;

  const rows: ExportJobResponse[] = tab === "session" ? trackedJobs : (history?.exports ?? []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jobs"
        description={`Monitor a running export, then download it. Links expire ${LIMITS.downloadsExpiryHours}h after completion — Sync mints a fresh one.`}
        actions={
          <Link href="/query">
            <Button type="button" variant="secondary">
              New query
            </Button>
          </Link>
        }
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      <Panel
        title="Monitor"
        description={
          activeJobId && job && !isTerminal(job.status)
            ? "Polling every 10s, easing to 30s until the job finishes"
            : "Paste a job ID, or pick one from the tables below"
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <TextInput
            className="min-w-[280px] flex-1 font-mono text-xs"
            placeholder="Job ID"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!manualId.trim()}
            onClick={() => setActiveJobId(manualId.trim())}
          >
            Track job
          </Button>
          {activeJobId && (
            <>
              <Button type="button" variant="ghost" onClick={() => void pollOnce(activeJobId)}>
                Refresh now
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setActiveJobId(null);
                  setJob(null);
                }}
              >
                Stop watching
              </Button>
            </>
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
              <Stat label="Created" value={<span className="text-sm">{formatTimestamp(job.created_at)}</span>} />
              <Stat label="Completed" value={<span className="text-sm">{formatTimestamp(job.completed_at)}</span>} />
              <Stat
                label="Execution"
                value={formatDuration(job.execution_time_seconds)}
              />
            </div>

            {job.error_message && <Alert tone="danger">{job.error_message}</Alert>}

            {job.download_url ? (
              <div className="rounded-md border border-success/30 bg-success/10 p-3">
                <div className="text-sm font-medium text-success">Download ready</div>
                <div className="mt-1 text-xs text-text-muted">
                  Expires {job.download_expires_at ? formatTimestamp(job.download_expires_at) : `${LIMITS.downloadsExpiryHours}h after completion`} · no
                  auth needed, treat the link as sensitive
                </div>
                <a
                  href={job.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-9 items-center rounded-md bg-accent-solid px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Download file
                </a>
              </div>
            ) : (
              isTerminal(job.status) && (
                <Button type="button" variant="secondary" onClick={() => void syncJob(job.job_id)}>
                  Sync for a fresh download link
                </Button>
              )
            )}

            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Processing phases</div>
              <div className="flex flex-wrap gap-2">
                {EXPORT_PHASES.map((phase, i) => {
                  const done = i < phasesDone(job.status);
                  return (
                    <span
                      key={phase}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        done ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-muted"
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
          <EmptyState>
            Nothing being watched.{" "}
            <Link href="/query" className="text-accent underline">
              Build a query
            </Link>{" "}
            and start an export, or track a job ID above.
          </EmptyState>
        )}
      </Panel>

      <Panel
        title="Your exports"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={tab}
              options={[
                { value: "session" as const, label: `This browser (${trackedJobs.length})` },
                { value: "history" as const, label: "Server history" },
              ]}
              onChange={setTab}
            />
            {tab === "history" ? (
              <>
                <Select className="w-24" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  {[10, 20, 50, LIMITS.historyLimitMax].map((n) => (
                    <option key={n} value={n}>
                      Last {n}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void loadHistory()}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Loading…" : "Refresh"}
                </Button>
              </>
            ) : (
              trackedJobs.length > 0 && (
                <Button type="button" variant="ghost" onClick={clearJobs}>
                  Clear list
                </Button>
              )
            )}
          </div>
        }
        description={
          tab === "session"
            ? "Jobs started or tracked from this browser, kept in localStorage"
            : history
              ? `User ${history.user_id} · ${history.total} job(s) returned`
              : "Fetched from GET /api/v1/user/exports"
        }
      >
        {rows.length === 0 ? (
          <EmptyState>
            {tab === "session"
              ? "No jobs tracked in this browser yet."
              : historyLoading
                ? "Loading…"
                : "No exports found. An API key is required to read history."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Job ID", "Status", "Created", "Completed", "Rows", "MB", "Secs", ""].map((h) => (
                    <th key={h || "actions"} className="label-caps px-2 pb-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.job_id}
                    className={`border-b border-border/50 ${row.job_id === activeJobId ? "bg-accent/5" : ""}`}
                  >
                    <td className="px-2 py-2 font-mono">{row.job_id}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{formatTimestamp(row.created_at)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{formatTimestamp(row.completed_at)}</td>
                    <td className="px-2 py-2">
                      {(row.rows_returned ?? row.rows)?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-2 py-2">{row.file_size_mb ?? "—"}</td>
                    <td className="px-2 py-2">
                      {formatDuration(row.execution_time_seconds ?? row.execution_time)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveJobId(row.job_id);
                            setManualId(row.job_id);
                          }}
                        >
                          Monitor
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => void syncJob(row.job_id)}>
                          Sync
                        </Button>
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
