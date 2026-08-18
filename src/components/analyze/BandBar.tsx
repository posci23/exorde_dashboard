"use client";

import type { BandKey } from "@/lib/analysis/types";
import type { Split } from "@/lib/analysis/derive";
import { formatCount, formatPercent } from "@/lib/analysis/format";
import { useT } from "@/lib/i18n/locale";
import { BAND_COLOR, BAND_ORDER } from "./palette";

/** Band names in the reader's language, for legends, labels and aria text. */
export function useBandLabels(): Record<BandKey, string> {
  const t = useT();
  return {
    negative: t.analyze.summary.negative,
    neutral: t.analyze.summary.neutral,
    positive: t.analyze.summary.positive,
  };
}

/**
 * A 100%-wide stacked bar: negative, neutral, positive, always in that order
 * so the eye can compare rows without re-reading the legend. Segments are
 * separated by a surface gap and labelled in place when they are wide enough.
 */
export function BandStack({
  split,
  height = "h-10",
  showLabels = true,
}: {
  split: Split;
  height?: string;
  showLabels?: boolean;
}) {
  const labels = useBandLabels();
  if (!split.count) return null;

  return (
    <div
      className={`flex ${height} w-full gap-0.5 overflow-hidden rounded-full`}
      role="img"
      aria-label={BAND_ORDER.map(
        (band) =>
          `${labels[band]} ${formatPercent(split[band], split.count)} (${formatCount(split[band])})`,
      ).join(", ")}
    >
      {BAND_ORDER.map((band) => {
        const share = split[band] / split.count;
        if (share <= 0) return null;
        return (
          <div
            key={band}
            title={`${labels[band]} — ${formatPercent(split[band], split.count)} · ${formatCount(split[band])}`}
            style={{ width: `${share * 100}%`, background: BAND_COLOR[band] }}
            className="flex items-center justify-center overflow-hidden"
          >
            {showLabels && share > 0.08 && (
              <span className="tnum truncate px-2 text-xs font-medium text-white">
                {formatPercent(split[band], split.count, 0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The legend that keeps band identity off colour alone. */
export function BandLegend() {
  const labels = useBandLabels();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {BAND_ORDER.map((band) => (
        <span key={band} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: BAND_COLOR[band] }}
          />
          {labels[band]}
        </span>
      ))}
    </div>
  );
}
