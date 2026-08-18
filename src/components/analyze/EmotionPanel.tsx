"use client";

import { useMemo, useState } from "react";
import { EmptyState, Panel, SegmentedControl } from "@/components/ui";
import { emotionRows } from "@/lib/analysis/derive";
import type { Aggregate, Bands, BandKey } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { useBandLabels } from "./BandBar";
import { BAND_COLOR } from "./palette";

/**
 * Emotion columns are a magnitude, not an identity, so they get one hue and
 * length does the work. Picking a band re-reads the same bins for just that
 * slice of the sentiment line.
 */
export function EmotionPanel({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const labels = useBandLabels();
  const [band, setBand] = useState<BandKey | "all">("all");

  const rows = useMemo(() => emotionRows(aggregate, bands, band), [aggregate, bands, band]);
  const max = rows.reduce((peak, row) => Math.max(peak, row.mean), 0);
  const fill = band === "all" ? BAND_COLOR.positive : BAND_COLOR[band];

  return (
    <Panel
      title={t.analyze.emotions.title}
      description={t.analyze.emotions.description}
      actions={
        aggregate.emotions.names.length > 0 && (
          <SegmentedControl
            value={band}
            onChange={setBand}
            options={[
              { value: "all" as const, label: t.analyze.emotions.all },
              { value: "positive" as const, label: labels.positive },
              { value: "neutral" as const, label: labels.neutral },
              { value: "negative" as const, label: labels.negative },
            ]}
          />
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyState>{t.analyze.emotions.empty}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 12).map((row) => (
            <li key={row.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs text-text" title={row.label}>
                {row.label}
              </span>
              <span className="h-4 min-w-0 flex-1 rounded-full bg-surface-container-low">
                <span
                  className="block h-4 rounded-full"
                  style={{
                    width: `${max ? Math.max(1, (row.mean / max) * 100) : 0}%`,
                    background: fill,
                  }}
                  title={`${row.label} — ${row.mean.toFixed(4)}`}
                />
              </span>
              <span className="tnum w-16 shrink-0 text-right text-xs text-text-muted">
                {row.mean.toFixed(3)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
