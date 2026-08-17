"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, PageHeader, PageShell, Panel, Stat } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { LIMITS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/format";
import { useT } from "@/lib/i18n/locale";
import type { HealthResponse, QueueCapacityResponse, UserQuotaResponse } from "@/lib/types";

function humanize(key: string) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCount(value: number | null | undefined) {
  return value == null ? null : value.toLocaleString();
}

const USAGE_ROWS = [
  { period: "today", metric: "exports", limitKey: "daily_exports", label: "exportsToday" },
  { period: "today", metric: "rows", limitKey: "daily_rows", label: "rowsToday" },
  { period: "this_month", metric: "exports", limitKey: "monthly_exports", label: "exportsMonth" },
  { period: "this_month", metric: "rows", limitKey: "monthly_rows", label: "rowsMonth" },
] as const;

export default function StatusPage() {
  const t = useT();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [queue, setQueue] = useState<QueueCapacityResponse | null>(null);
  const [quota, setQuota] = useState<UserQuotaResponse | null>(null);
  const [errors, setErrors] = useState<Array<"health" | "queue" | "quota">>([]);
  const [errorDetail, setErrorDetail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [h, q, u] = await Promise.all([
      apiFetch<HealthResponse>("/api/sentinel/health"),
      apiFetch<QueueCapacityResponse>("/api/sentinel/queue-capacity"),
      apiFetch<UserQuotaResponse>("/api/sentinel/user-quota"),
    ]);

    setHealth(h.ok && h.data ? h.data : null);
    setQueue(q.ok && q.data ? q.data : null);
    setQuota(u.ok && u.data ? u.data : null);

    setErrors(
      ([
        !h.ok && "health",
        !q.ok && "queue",
        !u.ok && "quota",
      ] as const).filter((v): v is "health" | "queue" | "quota" => Boolean(v)),
    );
    setErrorDetail({
      health: formatError(h.error),
      queue: formatError(q.error),
      quota: formatError(u.error),
    });
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
    <PageShell className="space-y-6">
      <PageHeader
        title={t.overview.title}
        description={t.overview.description}
        actions={
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? t.common.refreshing : t.common.refresh}
          </Button>
        }
      />

      {errors.length > 0 && (
        <Alert tone="warning">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((scope) => (
              <li key={scope}>
                {scope === "health"
                  ? t.overview.healthError(errorDetail.health)
                  : scope === "queue"
                    ? t.overview.queueError(errorDetail.queue)
                    : t.overview.quotaError(errorDetail.quota)}
              </li>
            ))}
          </ul>
          {!quota && (
            <p className="mt-2">
              {t.overview.needKeyPrefix}
              <Link href="/settings" className="underline decoration-outline-variant underline-offset-2 hover:text-text">
                {t.overview.needKeyLink}
              </Link>
              .
            </p>
          )}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.overview.apiStatus}
          value={health ? <StatusBadge status={health.status} /> : "—"}
          hint={health?.version ? `v${health.version}` : undefined}
        />
        <Stat label={t.overview.clickhouse} value={health?.clickhouse ?? "—"} hint={t.overview.clickhouseHint} />
        <Stat label={t.overview.postgres} value={health?.postgres ?? "—"} hint={t.overview.postgresHint} />
        <Stat label={t.overview.s3} value={health?.s3 ?? "—"} hint={t.overview.s3Hint} />
      </div>

      <Panel
        title={t.overview.yourPlan}
        description={
          quota
            ? `${quota.plan ?? t.overview.unknownPlan} · ${quota.status}${quota.email ? ` · ${quota.email}` : ""}`
            : t.common.requiresApiKey
        }
        actions={
          quota?.reset_at ? (
            <span className="text-xs text-text-subtle">
              {t.overview.quotaResets(formatTimestamp(quota.reset_at))}
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
                    className="rounded-xl bg-surface px-4 py-3.5"
                  >
                    <div className="label-caps">{t.overview[row.label]}</div>
                    <div className="tnum mt-1.5 text-xl font-medium text-text">
                      {used?.toLocaleString() ?? "—"}
                      <span className="text-sm font-normal text-text-subtle"> / {formatCount(cap) ?? t.common.unlimited}</span>
                    </div>
                    {pct != null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-text"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    {remaining != null && (
                      <div className="tnum mt-1.5 text-xs text-text-muted">{t.common.left(remaining.toLocaleString())}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {extraLimits.length > 0 && (
              <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {extraLimits.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 border-b border-outline-variant/40 py-1">
                    <dt className="text-text-muted">{humanize(key)}</dt>
                    <dd className="tnum font-mono text-xs text-text">{formatCount(value) ?? t.common.unlimited}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {t.overview.addKeyPrefix}
            <Link href="/settings" className="underline decoration-outline-variant underline-offset-2">
              {t.overview.settings}
            </Link>
            {t.overview.addKeySuffix}
          </p>
        )}
      </Panel>

      <Panel title={t.overview.queueTitle} description={t.overview.queueDescription(LIMITS.concurrentGlobal)}>
        {queue ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label={t.overview.runningNow} value={queue.current_jobs} />
              <Stat label={t.overview.capacity} value={queue.max_capacity} />
              <Stat label={t.overview.utilization} value={`${queue.utilization_pct}%`} />
              <Stat
                label={t.overview.acceptingJobs}
                value={queue.accepting_new_jobs ? t.common.yes : t.common.no}
                hint={queue.accepting_new_jobs ? t.overview.safeToSubmit : t.overview.waitAndRetry}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={`h-full rounded-full transition-all ${queue.accepting_new_jobs ? "bg-text" : "bg-warning"}`}
                style={{ width: `${Math.min(queue.utilization_pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              {t.overview.concurrencyNote(LIMITS.concurrentPerCustomer, LIMITS.inFlightPerCustomer)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{t.overview.queueNeedsKey}</p>
        )}
      </Panel>
    </PageShell>
  );
}
