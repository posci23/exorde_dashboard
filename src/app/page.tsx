"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, PageHeader, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { LIMITS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/format";
import type { HealthResponse, QueueCapacityResponse, UserQuotaResponse } from "@/lib/types";

/** `max_rows_per_day` → "Max rows per day" */
function humanize(key: string) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCount(value: number | null | undefined) {
  return value == null ? "unlimited" : value.toLocaleString();
}


/**
 * Usage is reported per period (`usage.today.exports`) while the matching cap
 * lives flat under limits (`limits.daily_exports`), so each tile names both.
 */
const USAGE_ROWS = [
  { period: "today", metric: "exports", limitKey: "daily_exports", label: "Exports today" },
  { period: "today", metric: "rows", limitKey: "daily_rows", label: "Rows today" },
  { period: "this_month", metric: "exports", limitKey: "monthly_exports", label: "Exports this month" },
  { period: "this_month", metric: "rows", limitKey: "monthly_rows", label: "Rows this month" },
] as const;

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [queue, setQueue] = useState<QueueCapacityResponse | null>(null);
  const [quota, setQuota] = useState<UserQuotaResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [h, q, u] = await Promise.all([
      apiFetch<HealthResponse>("/api/exorde/health"),
      apiFetch<QueueCapacityResponse>("/api/exorde/queue-capacity"),
      apiFetch<UserQuotaResponse>("/api/exorde/user-quota"),
    ]);

    setHealth(h.ok && h.data ? h.data : null);
    setQueue(q.ok && q.data ? q.data : null);
    setQuota(u.ok && u.data ? u.data : null);

    // Report every failure rather than letting the last one overwrite the others.
    setErrors(
      [
        !h.ok && `Health: ${formatError(h.error)}`,
        !q.ok && `Queue: ${formatError(q.error)}`,
        !u.ok && `Quota: ${formatError(u.error)}`,
      ].filter((v): v is string => Boolean(v)),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const limits = quota?.limits ?? {};
  const extraLimits = Object.entries(limits).filter(
    ([key]) => !USAGE_ROWS.some((r) => r.limitKey === key),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Whether the API is up, whether the queue has room, and how much of your quota is left."
        actions={
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {errors.length > 0 && (
        <Alert tone="warning">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {!quota && (
            <p className="mt-2">
              Most of these need an API key —{" "}
              <Link href="/settings" className="underline">
                configure one in Settings
              </Link>
              .
            </p>
          )}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="API status"
          value={health ? <StatusBadge status={health.status} /> : "—"}
          hint={health?.version ? `v${health.version}` : undefined}
        />
        <Stat label="ClickHouse" value={health?.clickhouse ?? "—"} hint="Post storage" />
        <Stat label="PostgreSQL" value={health?.postgres ?? "—"} hint="Jobs & quota" />
        <Stat label="S3" value={health?.s3 ?? "—"} hint="Export files" />
      </div>

      <Panel
        title="Your plan"
        description={
          quota
            ? `${quota.plan ?? "unknown plan"} · ${quota.status}${quota.email ? ` · ${quota.email}` : ""}`
            : "Requires an API key"
        }
        actions={
          quota?.reset_at ? (
            <span className="text-xs text-text-subtle">
              Quota resets {formatTimestamp(quota.reset_at)}
            </span>
          ) : undefined
        }
      >
        {quota ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {USAGE_ROWS.map((row) => {
                const period = quota.usage?.[row.period];
                const used = period?.[row.metric];
                const remaining = period?.[row.metric === "exports" ? "remaining_exports" : "remaining_rows"];
                const cap = limits[row.limitKey];
                const pct = cap != null && cap > 0 && used != null ? (used / cap) * 100 : null;
                return (
                  <div
                    key={`${row.period}.${row.metric}`}
                    className="rounded-xl border border-border bg-bg px-4 py-3.5"
                  >
                    <div className="label-caps">{row.label}</div>
                    <div className="tnum mt-1.5 text-xl font-medium text-text">
                      {used?.toLocaleString() ?? "—"}
                      <span className="text-sm font-normal text-text-subtle"> / {formatCount(cap)}</span>
                    </div>
                    {pct != null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-accent"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    {remaining != null && (
                      <div className="tnum mt-1.5 text-xs text-text-muted">{remaining.toLocaleString()} left</div>
                    )}
                  </div>
                );
              })}
            </div>

            {extraLimits.length > 0 && (
              <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {extraLimits.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b border-border/40 py-1">
                    <dt className="text-text-muted">{humanize(key)}</dt>
                    <dd className="tnum font-mono text-xs text-text">{formatCount(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Add your key in{" "}
            <Link href="/settings" className="text-accent underline">
              Settings
            </Link>{" "}
            to see your plan, limits, and usage.
          </p>
        )}
      </Panel>

      <Panel title="Export queue" description={`Shared across all customers · ${LIMITS.concurrentGlobal} slots`}>
        {queue ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Running now" value={queue.current_jobs} />
              <Stat label="Capacity" value={queue.max_capacity} />
              <Stat label="Utilization" value={`${queue.utilization_pct}%`} />
              <Stat
                label="Accepting jobs"
                value={queue.accepting_new_jobs ? "yes" : "no"}
                hint={queue.accepting_new_jobs ? "Safe to submit" : "Wait and retry"}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className={`h-full rounded-full transition-all ${queue.accepting_new_jobs ? "bg-accent" : "bg-warning"}`}
                style={{ width: `${Math.min(queue.utilization_pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              You can also have at most {LIMITS.concurrentPerCustomer} running and{" "}
              {LIMITS.inFlightPerCustomer} in-flight jobs. A 503 means the queue is full — back off and
              re-check here.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Queue capacity requires an API key.</p>
        )}
      </Panel>

      <Panel title="How the workflow runs" description="Preview is free; only exports consume quota">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1 · Build & preview", href: "/query", text: "Set filters, get an exact count and 100 sample rows. No quota used." },
            { step: "2 · Export", href: "/query", text: "Same filters, run as an async job. This consumes quota." },
            { step: "3 · Monitor", href: "/jobs", text: "Watch it move through 7 phases to completed." },
            { step: "4 · Download", href: "/jobs", text: `Presigned link, valid ${LIMITS.downloadsExpiryHours}h. Sync to refresh it.` },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="rounded-md border border-border bg-surface-raised p-3 transition hover:border-accent/40"
            >
              <div className="font-mono text-xs text-accent">{item.step}</div>
              <div className="mt-1 text-sm text-text-muted">{item.text}</div>
            </Link>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
