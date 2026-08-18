"use client";

import { useMemo, useState } from "react";
import { EmptyState, Panel, SegmentedControl, Select } from "@/components/ui";
import { groupRows, type GroupRow } from "@/lib/analysis/derive";
import { formatCount, formatPercent, formatScore } from "@/lib/analysis/format";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { BandLegend, BandStack } from "./BandBar";

type Dimension = "domain" | "language" | "classification" | "author";
type Sort = "volume" | "negative" | "positive";

const TOP_N = 12;

/** Matches the aggregator's per-dimension tracking cap. */
const TRACKING_CAP = 300;

/**
 * The same three-band split, cut by whatever dimension the file carries. Rows
 * are stacked bars rather than a grouped chart: one line per group reads at a
 * glance and leaves room for long domain names and handles.
 */
export function BreakdownPanel({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const [dimension, setDimension] = useState<Dimension>("domain");
  const [sort, setSort] = useState<Sort>("volume");

  const dimensionLabels: Record<Dimension, string> = {
    domain: t.analyze.breakdown.domain,
    language: t.analyze.breakdown.language,
    classification: t.analyze.breakdown.topic,
    author: t.analyze.breakdown.author,
  };

  const rows = useMemo(() => {
    const all = groupRows(aggregate.groups[dimension], bands, 200);
    const sorted = [...all];
    if (sort === "negative") sorted.sort((a, b) => b.negative / b.count - a.negative / a.count);
    else if (sort === "positive") sorted.sort((a, b) => b.positive / b.count - a.positive / a.count);
    return sorted.slice(0, TOP_N);
  }, [aggregate, bands, dimension, sort]);

  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0);

  return (
    <Panel
      title={t.analyze.breakdown.title}
      description={t.analyze.breakdown.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={dimension}
            aria-label={t.analyze.breakdown.title}
            className="w-auto"
            onChange={(event) => setDimension(event.target.value as Dimension)}
          >
            {(Object.keys(dimensionLabels) as Dimension[]).map((key) => (
              <option key={key} value={key}>
                {dimensionLabels[key]}
              </option>
            ))}
          </Select>
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: "volume" as const, label: t.analyze.breakdown.sortVolume },
              { value: "negative" as const, label: t.analyze.breakdown.sortNegative },
              { value: "positive" as const, label: t.analyze.breakdown.sortPositive },
            ]}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>{t.analyze.breakdown.empty}</EmptyState>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {rows.map((row) => (
              <BreakdownRow key={row.key} row={row} max={max} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BandLegend />
            {aggregate.groups[dimension].length >= TRACKING_CAP && (
              <span className="text-xs text-text-subtle">
                {t.analyze.breakdown.truncated(formatCount(TRACKING_CAP))}
              </span>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function BreakdownRow({ row, max }: { row: GroupRow; max: number }) {
  const t = useT();
  return (
    <li className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-medium text-text" title={row.key}>
          {row.key}
        </span>
        <span className="tnum shrink-0 text-xs text-text-muted">
          {t.analyze.breakdown.posts(formatCount(row.count))} · {formatScore(row.net)}
        </span>
      </div>
      {/* Row width tracks volume, so a 4-post group can't look like a trend. */}
      <div className="mt-1.5" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}>
        <BandStack split={row} height="h-6" showLabels={false} />
      </div>
      <div className="tnum mt-1 text-[11px] text-text-subtle">
        {formatPercent(row.negative, row.count, 0)} · {formatPercent(row.neutral, row.count, 0)} ·{" "}
        {formatPercent(row.positive, row.count, 0)}
      </div>
    </li>
  );
}
