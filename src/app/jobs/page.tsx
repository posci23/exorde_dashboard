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
  PageShell,
  Panel,
  SegmentedControl,
  Select,
  Stat,
  TextInput,
} from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { EXPORT_PHASES, LIMITS } from "@/lib/constants";
import { formatDuration, formatTimestamp } from "@/lib/format";
import {
  getDownloadLinkState,
  isDownloadExpiringSoon,
  shortJobId,
  type DownloadLinkState,
} from "@/lib/job-utils";
import { useT } from "@/lib/i18n/locale";
import type { ExportJobResponse, UserExportsResponse } from "@/lib/types";

const TERMINAL = ["completed", "failed", "rejected"];

function isTerminal(status: string) {
  return TERMINAL.includes(status.toLowerCase());
}

function phasesDone(status: string): number {
  const s = status.toLowerCase();
  if (s === "completed") return EXPORT_PHASES.length;
  if (s === "running") return 5;
  if (s === "validated") return 2;
  if (s === "pending") return 1;
  return 0;
}

function linkTone(state: DownloadLinkState): string {
  switch (state) {
    case "ready":
      return "bg-success/15 text-success";
    case "expired":
      return "bg-warning/15 text-warning";
    case "processing":
      return "bg-surface-container-high text-accent";
    case "failed":
      return "bg-danger/15 text-danger";
    default:
      return "bg-surface-container-high text-text-muted";
  }
}

export default function JobsPage() {
  return (
    <Suspense fallback={<PageShell><p className="text-sm text-text-muted">Loading…</p></PageShell>}>
      <JobsView />
    </Suspense>
  );
}

function JobsView() {
  const t = useT();
  const searchParams = useSearchParams();
  const { trackedJobs, upsertJob, clearJobs, ready } = useQueryStore();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ExportJobResponse | null>(null);
  const [manualId, setManualId] = useState("");
  const [showIdTrack, setShowIdTrack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<"session" | "history">("session");
  const [limit, setLimit] = useState<number>(LIMITS.historyLimitDefault);
  const [history, setHistory] = useState<UserExportsResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const pollDelay = useRef(10_000);

  const pollOnce = useCallback(
    async (jobId: string) => {
      const res = await apiFetch<ExportJobResponse>(`/api/sentinel/export/${encodeURIComponent(jobId)}`);
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

  const selectJob = useCallback((row: ExportJobResponse) => {
    setActiveJobId(row.job_id);
    setJob(row);
    setManualId(row.job_id);
  }, []);

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
    const res = await apiFetch<UserExportsResponse>(`/api/sentinel/exports?limit=${limit}`);
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
    const res = await apiFetch<ExportJobResponse>("/api/sentinel/sync", {
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
        ? t.jobs.syncedRefreshed(
            res.data.download_expires_at
              ? formatTimestamp(res.data.download_expires_at)
              : t.jobs.expiryFallback,
          )
        : t.jobs.syncedStatus(res.data.status),
    );
  }

  async function copyDownloadLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(t.jobs.linkCopied);
    } catch {
      setError("Could not copy link");
    }
  }

  function linkLabel(row: ExportJobResponse): string {
    const state = getDownloadLinkState(row);
    if (state === "ready") {
      if (row.download_expires_at && isDownloadExpiringSoon(row.download_expires_at)) {
        return t.jobs.linkExpiringSoon;
      }
      return t.jobs.linkActive;
    }
    if (state === "expired") return t.jobs.linkExpired;
    if (state === "processing") return t.jobs.linkProcessing;
    if (state === "failed") return t.common.none;
    return t.jobs.linkUnavailable;
  }

  if (!ready) return <PageShell><p className="text-sm text-text-muted">Loading…</p></PageShell>;

  const rows: ExportJobResponse[] = tab === "session" ? trackedJobs : (history?.exports ?? []);
  const activeLinkState = job ? getDownloadLinkState(job) : null;

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title={t.jobs.title}
        description={t.jobs.description(LIMITS.downloadsExpiryHours)}
        actions={
          <Link href="/">
            <Button type="button" variant="secondary">
              {t.jobs.newQuery}
            </Button>
          </Link>
        }
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      <Panel
        title={t.jobs.activeExport}
        description={
          activeJobId && job && !isTerminal(job.status)
            ? t.jobs.polling
            : t.jobs.pickExport
        }
      >
        {job ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-base font-medium text-text">
                  {formatTimestamp(job.created_at)}
                  {(job.rows_returned ?? job.rows) != null && (
                    <span className="text-text-muted">
                      {" "}
                      · {t.jobs.exportRows((job.rows_returned ?? job.rows)!.toLocaleString())}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-xs text-text-muted">
                  {t.jobs.jobRef}: {job.job_id}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => void pollOnce(job.job_id)}>
                  {t.jobs.refreshNow}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveJobId(null);
                    setJob(null);
                  }}
                >
                  {t.jobs.stopWatching}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={t.jobs.status} value={<StatusBadge status={job.status} />} />
              <Stat label={t.jobs.rows} value={job.rows_returned?.toLocaleString() ?? "—"} />
              <Stat label={t.jobs.size} value={job.file_size_mb != null ? `${job.file_size_mb} MB` : "—"} />
              <Stat label={t.jobs.execution} value={formatDuration(job.execution_time_seconds)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t.jobs.colCreated} value={<span className="text-sm">{formatTimestamp(job.created_at)}</span>} />
              <Stat label={t.jobs.colCompleted} value={<span className="text-sm">{formatTimestamp(job.completed_at)}</span>} />
            </div>

            {job.error_message && <Alert tone="danger">{job.error_message}</Alert>}

            {activeLinkState === "ready" && job.download_url ? (
              <div className="rounded-md border border-success/30 bg-success/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${linkTone("ready")}`}>
                    {linkLabel(job)}
                  </span>
                  <span className="text-sm font-medium text-success">{t.jobs.downloadReady}</span>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {t.jobs.expires(
                    job.download_expires_at
                      ? formatTimestamp(job.download_expires_at)
                      : t.jobs.expiresDefault(LIMITS.downloadsExpiryHours),
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={job.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-full bg-accent-solid px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                  >
                    {t.jobs.downloadFile}
                  </a>
                  <Button type="button" variant="secondary" onClick={() => void copyDownloadLink(job.download_url!)}>
                    {t.jobs.copyLink}
                  </Button>
                  <Link href="/analyze" title={t.jobs.analyzeHint}>
                    <Button type="button" variant="secondary">
                      {t.jobs.analyze}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : activeLinkState === "expired" ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${linkTone("expired")}`}>
                    {t.jobs.linkExpired}
                  </span>
                  <span className="text-sm text-text-muted">
                    {job.download_expires_at
                      ? formatTimestamp(job.download_expires_at)
                      : t.jobs.expiresDefault(LIMITS.downloadsExpiryHours)}
                  </span>
                </div>
                <Button type="button" variant="secondary" className="mt-3" onClick={() => void syncJob(job.job_id)}>
                  {t.jobs.syncForLink}
                </Button>
              </div>
            ) : !isTerminal(job.status) ? (
              <div className="rounded-md border border-outline-variant/50 bg-surface-container-high/50 p-4">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${linkTone("processing")}`}>
                  {t.jobs.linkProcessing}
                </span>
                <p className="mt-2 text-xs text-text-muted">
                  {t.jobs.expiresDefault(LIMITS.downloadsExpiryHours)}
                </p>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => void syncJob(job.job_id)}>
                {t.jobs.syncForLink}
              </Button>
            )}

            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">{t.jobs.processingPhases}</div>
              <div className="flex flex-wrap gap-2">
                {EXPORT_PHASES.map((phase, i) => {
                  const done = i < phasesDone(job.status);
                  return (
                    <span
                      key={phase}
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        done ? "bg-surface-container-highest text-text" : "bg-surface-container-high text-text-muted"
                      }`}
                    >
                      {i + 1}. {t.catalog.phase[phase] ?? phase}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState>
            {t.jobs.nothingWatched}{" "}
            <Link href="/" className="underline decoration-outline-variant underline-offset-2">
              {t.jobs.buildAQuery}
            </Link>
            {t.jobs.andStartExport}
          </EmptyState>
        )}

        <details
          className="mt-4 border-t border-outline-variant/40 pt-4"
          open={showIdTrack}
          onToggle={(e) => setShowIdTrack((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-xs text-text-muted">{t.jobs.trackById}</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <TextInput
              className="min-w-[280px] flex-1 font-mono text-xs"
              placeholder={t.jobs.jobIdPlaceholder}
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!manualId.trim()}
              onClick={() => setActiveJobId(manualId.trim())}
            >
              {t.jobs.trackJob}
            </Button>
          </div>
        </details>
      </Panel>

      <Panel
        title={t.jobs.yourExports}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={tab}
              options={[
                { value: "session" as const, label: t.jobs.thisBrowser(trackedJobs.length) },
                { value: "history" as const, label: t.jobs.serverHistory },
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
                  {historyLoading ? t.common.loading : t.common.refresh}
                </Button>
              </>
            ) : (
              trackedJobs.length > 0 && (
                <Button type="button" variant="ghost" onClick={clearJobs}>
                  {t.jobs.clearList}
                </Button>
              )
            )}
          </div>
        }
        description={
          tab === "session"
            ? t.jobs.sessionNote
            : history
              ? t.jobs.historyNote(String(history.user_id), history.total)
              : t.jobs.fetchedFrom
        }
      >
        {rows.length === 0 ? (
          <EmptyState>
            {tab === "session"
              ? t.jobs.noneTracked
              : historyLoading
                ? t.common.loading
                : t.jobs.noExports}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[t.jobs.colExport, t.jobs.status, t.jobs.colLink, t.jobs.colMb, t.jobs.colSecs, ""].map((h) => (
                    <th scope="col" key={h || "actions"} className="label-caps px-2 pb-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const linkState = getDownloadLinkState(row);
                  const isActive = row.job_id === activeJobId;
                  const rowsCount = row.rows_returned ?? row.rows;
                  return (
                    <tr
                      key={row.job_id}
                      className={`border-b border-outline-variant/50 ${isActive ? "bg-surface-container-high" : ""}`}
                    >
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => selectJob(row)}
                        >
                          <div className="whitespace-nowrap text-text">{formatTimestamp(row.created_at)}</div>
                          <div className="mt-0.5 text-text-muted">
                            {rowsCount != null ? t.jobs.exportRows(rowsCount.toLocaleString()) : shortJobId(row.job_id)}
                          </div>
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${linkTone(linkState)}`}>
                            {linkLabel(row)}
                          </span>
                          {linkState === "ready" && row.download_expires_at && (
                            <div className="whitespace-nowrap text-text-muted">
                              {formatTimestamp(row.download_expires_at)}
                            </div>
                          )}
                          {linkState === "expired" && row.download_expires_at && (
                            <div className="whitespace-nowrap text-text-muted">
                              {formatTimestamp(row.download_expires_at)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">{row.file_size_mb ?? "—"}</td>
                      <td className="px-2 py-2">
                        {formatDuration(row.execution_time_seconds ?? row.execution_time)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {linkState === "ready" && row.download_url ? (
                            <>
                              <a href={row.download_url} target="_blank" rel="noopener noreferrer">
                                <Button type="button" variant="ghost" size="sm">
                                  {t.jobs.download}
                                </Button>
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void copyDownloadLink(row.download_url!)}
                              >
                                {t.jobs.copyLink}
                              </Button>
                              <Link href="/analyze" title={t.jobs.analyzeHint}>
                                <Button type="button" variant="ghost" size="sm">
                                  {t.jobs.analyze}
                                </Button>
                              </Link>
                            </>
                          ) : linkState === "expired" || linkState === "unavailable" ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => void syncJob(row.job_id)}>
                              {t.jobs.sync}
                            </Button>
                          ) : null}
                          <Button type="button" variant="ghost" size="sm" onClick={() => selectJob(row)}>
                            {t.jobs.open}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
