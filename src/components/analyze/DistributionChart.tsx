"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/ui";
import { histogramBars } from "@/lib/analysis/derive";
import { formatCount } from "@/lib/analysis/format";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { BandLegend } from "./BandBar";
import { AXIS_COLOR, BAND_COLOR, GRID_COLOR, TOOLTIP_STYLE } from "./palette";

/**
 * The shape behind the three headline numbers: where scores actually sit. Bar
 * colour follows the band the score falls in, so moving the thresholds visibly
 * repaints the distribution.
 */
export function DistributionChart({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const bars = useMemo(() => histogramBars(aggregate.total, bands), [aggregate, bands]);

  return (
    <Panel title={t.analyze.distribution.title} description={t.analyze.distribution.description}>
      <div className="space-y-3">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={AXIS_COLOR}
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke={AXIS_COLOR}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={48}
                allowDecimals={false}
                tickFormatter={(value: number) => formatCount(value)}
              />
              <Tooltip
                cursor={{ fill: GRID_COLOR }}
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => `${t.analyze.distribution.axis} ${String(label)}`}
                formatter={(value) =>
                  [formatCount(Number(value)), t.analyze.distribution.posts] as [string, string]
                }
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {bars.map((bar) => (
                  <Cell key={bar.label} fill={BAND_COLOR[bar.band]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <BandLegend />
      </div>
    </Panel>
  );
}
