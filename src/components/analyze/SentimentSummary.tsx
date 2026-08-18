"use client";

import { Panel, Stat } from "@/components/ui";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import type { Split } from "@/lib/analysis/derive";
import { formatCount, formatPercent, formatScore } from "@/lib/analysis/format";
import { useT } from "@/lib/i18n/locale";
import { BandStack, useBandLabels } from "./BandBar";
import { BAND_COLOR, BAND_ORDER } from "./palette";

/**
 * The headline. Three bands, stated as counts and shares, with a 100% bar
 * rather than a pie: three segments on one line are read by length, and each
 * one carries its own label so colour is never the only cue.
 */
export function SentimentSummary({
  aggregate,
  split,
  bands,
}: {
  aggregate: Aggregate;
  split: Split;
  bands: Bands;
}) {
  const t = useT();
  const labels = useBandLabels();

  return (
    <Panel
      title={t.analyze.summary.title}
      description={
        aggregate.scale === "label"
          ? t.analyze.summary.labelMode
          : t.analyze.summary.bands(bands.negative.toFixed(2), bands.positive.toFixed(2))
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={t.analyze.summary.posts}
            value={formatCount(split.count)}
            hint={t.analyze.summary.ofRows(
              formatCount(aggregate.stats.rowsKept),
              formatCount(aggregate.stats.rowsRead),
            )}
          />
          <Stat
            label={t.analyze.summary.net}
            value={formatScore(split.net)}
            hint={t.analyze.summary.netHint}
          />
          <Stat
            label={t.analyze.summary.mean}
            value={formatScore(split.mean)}
            hint={t.analyze.summary.meanHint(
              aggregate.total.min.toFixed(2),
              aggregate.total.max.toFixed(2),
            )}
          />
        </div>

        <BandStack split={split} />

        <div className="grid gap-3 sm:grid-cols-3">
          {BAND_ORDER.map((band) => (
            <div
              key={band}
              className="rounded-xl border border-outline-variant/40 bg-surface/80 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: BAND_COLOR[band] }}
                />
                <span className="text-xs font-medium text-text">{labels[band]}</span>
              </div>
              <div className="tnum mt-1.5 text-xl font-medium text-text">
                {formatPercent(split[band], split.count)}
              </div>
              <div className="tnum mt-0.5 text-xs text-text-muted">
                {formatCount(split[band])}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
