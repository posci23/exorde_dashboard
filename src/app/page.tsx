"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { EXPORT_PHASES, LIMITS } from "@/lib/constants";
import type { HealthResponse, QueueCapacityResponse } from "@/lib/types";

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [queue, setQueue] = useState<QueueCapacityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [h, q] = await Promise.all([
      apiFetch<HealthResponse>("/api/exorde/health"),
      apiFetch<QueueCapacityResponse>("/api/exorde/queue-capacity"),
    ]);
    if (h.ok && h.data) setHealth(h.data);
    else setHealth(null);

    if (q.ok && q.data) setQueue(q.data);
    else {
      setQueue(null);
      if (!h.ok) setError([formatError(h.error), formatError(q.error)].filter(Boolean).join(" · "));
      else setError(`Queue: ${formatError(q.error)}`);
    }

    if (!h.ok) setError(formatError(h.error));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-text-muted">
            System health, queue capacity, and the full preview → export workflow.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {error && <Alert tone="warning">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="API status" value={health ? <StatusBadge status={health.status} /> : "—"} hint={health?.version ? `v${health.version}` : undefined} />
        <Stat label="ClickHouse" value={health?.clickhouse ?? "—"} />
        <Stat label="PostgreSQL" value={health?.postgres ?? "—"} />
        <Stat label="S3" value={health?.s3 ?? "—"} />
      </div>

      <Panel title="Export queue capacity" description="Cluster-wide running slots (global cap 8)">
        {queue ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Current jobs" value={queue.current_jobs} />
              <Stat label="Max capacity" value={queue.max_capacity} />
              <Stat label="Utilization" value={`${queue.utilization_pct}%`} />
              <Stat
                label="Accepting jobs"
                value={queue.accepting_new_jobs ? "yes" : "no"}
                hint={queue.accepting_new_jobs ? "Safe to submit" : "Backoff / wait"}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(queue.utilization_pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              Also enforced: {LIMITS.concurrentPerCustomer} running / customer · {LIMITS.inFlightPerCustomer}{" "}
              in-flight / customer. On 503, exponential backoff and re-check this endpoint.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Queue requires an API key. Configure in{" "}
            <Link href="/settings" className="text-accent underline">
              Settings
            </Link>
            .
          </p>
        )}
      </Panel>

      <Panel title="Quick-start workflow">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { step: "1 Preview", href: "/preview", text: "Free count + 100 samples. No quota." },
            { step: "2 Refine", href: "/preview", text: "Tune keywords, dates, domains, languages…" },
            { step: "3 Export", href: "/export", text: "Async job → S3 chunks. Consumes quota." },
            { step: "4 Poll", href: "/export", text: "Every 10–30s until completed." },
            { step: "5 Download", href: "/export", text: "Presigned URL, 48h, no auth." },
            { step: "6 History", href: "/history", text: "List past jobs · sync download URLs." },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="rounded-lg border border-border bg-bg-elevated p-3 transition hover:border-accent/40"
            >
              <div className="font-mono text-xs text-accent">{item.step}</div>
              <div className="mt-1 text-sm text-text-muted">{item.text}</div>
            </Link>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Export processing phases">
          <ol className="space-y-2">
            {EXPORT_PHASES.map((phase, i) => (
              <li key={phase} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 font-mono text-[11px] text-accent">
                  {i + 1}
                </span>
                {phase}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Hard limits at a glance">
          <ul className="space-y-2 text-sm text-text-muted">
            <li>Date range: {LIMITS.maxDateRangeDays}d ({LIMITS.maxPerDaySpanDays}d with per_day_limit)</li>
            <li>Max rows / export: {LIMITS.resultLimitMax.toLocaleString()}</li>
            <li>Timeout: {LIMITS.exportTimeoutSeconds}s · Download: {LIMITS.downloadsExpiryHours}h</li>
            <li>Keyword groups: {LIMITS.maxKeywordGroups} · Exclusion groups: {LIMITS.maxExcludeKeywordGroups}</li>
            <li>Preview is free · Export consumes plan quota</li>
            <li>
              Tables: <span className="font-mono text-text">exorde.posts</span> ∪{" "}
              <span className="font-mono text-text">exorde.back_posts</span>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
