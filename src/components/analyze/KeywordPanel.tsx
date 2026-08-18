"use client";

import { useMemo, useState } from "react";
import { EmptyState, Panel, SegmentedControl, TextInput } from "@/components/ui";
import { keywordRows } from "@/lib/analysis/derive";
import { formatCount, formatScore } from "@/lib/analysis/format";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { BandLegend, BandStack } from "./BandBar";

type Sort = "count" | "positive" | "negative";

/**
 * Which words travel with which mood. Sorting by net sentiment is the point —
 * "most common" alone just re-lists the query terms.
 */
export function KeywordPanel({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const [sort, setSort] = useState<Sort>("count");
  const [minCount, setMinCount] = useState(3);

  const rows = useMemo(
    () => keywordRows(aggregate, bands, { limit: 24, minCount, sort }),
    [aggregate, bands, minCount, sort],
  );
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0);

  if (!aggregate.keywords.length) {
    return (
      <Panel title={t.analyze.keywords.title} description={t.analyze.keywords.description}>
        <EmptyState>{t.analyze.keywords.empty}</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel
      title={t.analyze.keywords.title}
      description={t.analyze.keywords.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            {t.analyze.keywords.minCount}
            <TextInput
              type="number"
              min={1}
              max={1000}
              value={minCount}
              onChange={(event) => setMinCount(Math.max(1, Number(event.target.value) || 1))}
              className="tnum w-20 px-2 py-1.5 text-xs"
            />
          </label>
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: "count" as const, label: t.analyze.keywords.sortVolume },
              { value: "negative" as const, label: t.analyze.keywords.sortNegative },
              { value: "positive" as const, label: t.analyze.keywords.sortPositive },
            ]}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>{t.analyze.keywords.none}</EmptyState>
      ) : (
        <div className="space-y-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <li key={row.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-xs text-text" title={row.key}>
                    {row.key}
                  </span>
                  <span className="tnum shrink-0 text-[11px] text-text-muted">
                    {t.analyze.keywords.posts(formatCount(row.count))} · {formatScore(row.net)}
                  </span>
                </div>
                {/* Width tracks volume, so a three-post word can't read like a trend. */}
                <div className="mt-1" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}>
                  <BandStack split={row} height="h-4" showLabels={false} />
                </div>
              </li>
            ))}
          </ul>
          <BandLegend />
        </div>
      )}
    </Panel>
  );
}
