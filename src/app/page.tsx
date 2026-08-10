"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { LIMITS } from "@/lib/constants";
import type { HealthResponse, QueueCapacityResponse, UserQuotaResponse } from "@/lib/types";

/** `max_rows_per_day` → "Max rows per day" */
function humanize(key: string) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCount(value: number | null | undefined) {
  return value == null ? "unlimited" : value.toLocaleString();
}

/** Pair each usage counter with the limit whose name it echoes, e.g. exports_today ↔ max_exports_per_day. */
const USAGE_ROWS = [
  { usageKey: "exports_today", limitKey: "max_exports_per_day", label: "Exports today" },
  { usageKey: "exports_this_month", limitKey: "max_exports_per_month", label: "Exports this month" },
  { usageKey: "rows_exported_today", limitKey: "max_rows_per_day", label: "Rows today" },
  { usageKey: "rows_exported_this_month", limitKey: "max_rows_per_month", label: "Rows this month" },
] as const;

/** Usage arrives as a nested object whose grouping varies; flatten it to one lookup. */
function flattenUsage(usage: UserQuotaResponse["usage"] | undefined): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const group of Object.values(usage ?? {})) {
    if (group && typeof group === "object") {
      for (const [key, value] of Object.entries(group)) {
        if (typeof value === "number") flat[key] = value;
      }
    }
  }
  return flat;
}

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

  const usage = flattenUsage(quota?.usage);
  const limits = quota?.limits ?? {};
  const extraLimits = Object.entries(limits).filter(
    ([key]) => !USAGE_ROWS.some((r) => r.limitKey === key),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-text-muted">
            Is the API up, is there room in the queue, and how much of your quota is left.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

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
            <span className="text-xs text-text-muted">Resets {quota.reset_at}</span>
          ) : undefined
        }
      >
        {quota ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {USAGE_ROWS.map((row) => {
                const used = usage[row.usageKey];
                const cap = limits[row.limitKey];
                const pct = cap != null && cap > 0 && used != null ? (used / cap) * 100 : null;
                return (
                  <div key={row.usageKey} className="rounded-lg border border-border bg-bg-elevated px-3 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">{row.label}</div>
                    <div className="mt-1 font-mono text-xl text-text">
                      {used?.toLocaleString() ?? "—"}
                      <span className="text-sm text-text-muted"> / {formatCount(cap)}</span>
                    </div>
                    {pct != null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-accent"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
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
                    <dd className="font-mono text-text">{formatCount(value)}</dd>
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
              className="rounded-lg border border-border bg-bg-elevated p-3 transition hover:border-accent/40"
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
