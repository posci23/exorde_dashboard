"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, Panel, SegmentedControl } from "@/components/ui";
import { timeSeries, negativeSpikes } from "@/lib/analysis/derive";
import { formatBucket, formatCount, formatPercent } from "@/lib/analysis/format";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { BandLegend, useBandLabels } from "./BandBar";
import { AXIS_COLOR, BAND_COLOR, GRID_COLOR, TOOLTIP_STYLE } from "./palette";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function TrendChart({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const labels = useBandLabels();
  const [bucket, setBucket] = useState<"hour" | "day" | "week">(
    aggregate.bucketMs > HOUR ? "day" : "hour",
  );
  const [metric, setMetric] = useState<"count" | "share">("count");

  const bucketMs = bucket === "hour" ? HOUR : bucket === "day" ? DAY : WEEK;
  const series = useMemo(
    () => timeSeries(aggregate, bands, bucketMs),
    [aggregate, bands, bucketMs],
  );

  const data = useMemo(
    () =>
      series.map((point) => ({
        t: point.t,
        count: point.count,
        negative: metric === "share" ? point.negative / point.count : point.negative,
        neutral: metric === "share" ? point.neutral / point.count : point.neutral,
        positive: metric === "share" ? point.positive / point.count : point.positive,
      })),
    [series, metric],
  );

  const worst = useMemo(() => negativeSpikes(series, 1)[0] ?? null, [series]);

  return (
    <Panel
      title={t.analyze.trend.title}
      description={t.analyze.trend.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            options={[
              { value: "count" as const, label: t.analyze.trend.metricCount },
              { value: "share" as const, label: t.analyze.trend.metricShare },
            ]}
          />
          <SegmentedControl
            value={bucket}
            onChange={setBucket}
            options={[
              { value: "hour" as const, label: t.analyze.trend.bucketHour },
              { value: "day" as const, label: t.analyze.trend.bucketDay },
              { value: "week" as const, label: t.analyze.trend.bucketWeek },
            ]}
          />
        </div>
      }
    >
      {series.length === 0 ? (
        <EmptyState>{t.analyze.trend.empty}</EmptyState>
      ) : (
        <div className="space-y-3">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="t"
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  tickLine={false}
                  minTickGap={40}
                  tickFormatter={(value: number) => formatBucket(value, bucketMs)}
                />
                <YAxis
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  allowDecimals={metric === "share"}
                  tickFormatter={(value: number) =>
                    metric === "share" ? `${Math.round(value * 100)}%` : formatCount(value)
                  }
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(label) => formatBucket(Number(label), bucketMs)}
                  formatter={(value, name) =>
                    [
                      metric === "share"
                        ? `${(Number(value) * 100).toFixed(1)}%`
                        : formatCount(Number(value)),
                      labels[String(name) as keyof typeof labels] ?? String(name),
                    ] as [string, string]
                  }
                />
                {(["negative", "neutral", "positive"] as const).map((band) => (
                  <Area
                    key={band}
                    type="linear"
                    dataKey={band}
                    stackId="1"
                    stroke={BAND_COLOR[band]}
                    strokeWidth={2}
                    fill={BAND_COLOR[band]}
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BandLegend />
            {worst && (
              <span className="text-xs text-text-muted">
                {t.analyze.trend.worst(
                  formatBucket(worst.t, bucketMs),
                  formatPercent(worst.negative, worst.count, 0),
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
