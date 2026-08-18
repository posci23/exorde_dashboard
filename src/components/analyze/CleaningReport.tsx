"use client";

import { Alert, Button, Panel } from "@/components/ui";
import { formatBytes, formatCount } from "@/lib/analysis/format";
import { downloadSummaryCsv } from "@/lib/analysis/summary";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";

/**
 * What the cleaning pass did, in full. A dashboard that quietly drops a third
 * of the rows is worse than no dashboard, so every discard is named and
 * counted, and the column mapping it worked from is on the page.
 */
export function CleaningReport({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const { stats, mapping } = aggregate;

  const counts: Array<{ label: string; value: number }> = [
    { label: t.analyze.cleaning.rowsRead, value: stats.rowsRead },
    { label: t.analyze.cleaning.scored, value: stats.rowsKept },
    { label: t.analyze.cleaning.noScore, value: stats.noSentiment },
    { label: t.analyze.cleaning.malformed, value: stats.malformed },
    { label: t.analyze.cleaning.duplicates, value: stats.duplicates },
    { label: t.analyze.cleaning.filtered, value: stats.filteredOut },
    { label: t.analyze.cleaning.withTime, value: stats.withTimestamp },
    { label: t.analyze.cleaning.withText, value: stats.withText },
  ];

  const roles: Array<{ label: string; column: string | null }> = [
    { label: t.analyze.cleaning.roleSentiment, column: mapping.sentiment },
    { label: t.analyze.cleaning.roleTime, column: mapping.createdAt },
    { label: t.analyze.cleaning.roleText, column: mapping.text },
    { label: t.analyze.cleaning.roleDomain, column: mapping.domain },
    { label: t.analyze.cleaning.roleLanguage, column: mapping.language },
    { label: t.analyze.cleaning.roleTopic, column: mapping.classification },
    { label: t.analyze.cleaning.roleTopicScore, column: mapping.classificationScore },
    { label: t.analyze.cleaning.roleAuthor, column: mapping.author },
    { label: t.analyze.cleaning.roleKeywords, column: mapping.keywords },
    { label: t.analyze.cleaning.roleUrl, column: mapping.url },
    { label: t.analyze.cleaning.roleId, column: mapping.id },
  ];

  return (
    <Panel
      title={t.analyze.cleaning.title}
      description={t.analyze.cleaning.description}
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => downloadSummaryCsv(aggregate, bands, 86_400_000)}
        >
          {t.analyze.cleaning.download}
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-text-muted">
          {t.analyze.cleaning.file}: <span className="font-mono text-text">{aggregate.file.name}</span>{" "}
          · {formatBytes(aggregate.file.size)} · {aggregate.file.kind.toUpperCase()}
          {aggregate.file.gzipped ? " (gzip)" : ""} ·{" "}
          {t.analyze.cleaning.columnsFound(formatCount(aggregate.columns.length))}
        </p>

        {stats.negativeSeen === false && aggregate.scale === "signed" && stats.rowsKept > 0 && (
          <Alert tone="warning">{t.analyze.cleaning.warnNoNegative}</Alert>
        )}
        {stats.dedupeSaturated && <Alert tone="warning">{t.analyze.cleaning.warnDedupe}</Alert>}
        {stats.truncated && <Alert tone="warning">{t.analyze.cleaning.warnTruncated}</Alert>}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((row) => (
            <div key={row.label} className="rounded-xl bg-surface-container-low px-3.5 py-2.5">
              <dt className="text-[11px] text-text-muted">{row.label}</dt>
              <dd className="tnum mt-0.5 text-sm font-medium text-text">
                {formatCount(row.value)}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="label-caps">{t.analyze.cleaning.mapping}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {roles.map((role) => (
              <li
                key={role.label}
                className="rounded-md border border-outline-variant/60 bg-surface px-2 py-1 text-xs"
              >
                <span className="text-text-muted">{role.label}: </span>
                <span className={role.column ? "font-mono text-text" : "text-text-subtle"}>
                  {role.column ?? t.analyze.cleaning.unset}
                </span>
              </li>
            ))}
            {mapping.emotions.length > 0 && (
              <li className="rounded-md border border-outline-variant/60 bg-surface px-2 py-1 text-xs text-text-muted">
                {t.analyze.cleaning.roleEmotions(formatCount(mapping.emotions.length))}
              </li>
            )}
          </ul>
        </div>
      </div>
    </Panel>
  );
}