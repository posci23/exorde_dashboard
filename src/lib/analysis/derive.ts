/**
 * Bins → what the dashboard draws.
 *
 * Every function here is pure and cheap: the heavy pass already happened, so
 * dragging the neutral-band thresholds re-runs all of this in a millisecond
 * instead of re-reading the file.
 */

import { BINS, valueOfBin, type Aggregate, type Bands, type BandKey, type Binned, type GroupBin } from "./types";
import { emotionLabel } from "./columns";

export type Split = {
  negative: number;
  neutral: number;
  positive: number;
  count: number;
  /** Mean sentiment across the rows in this slice. */
  mean: number;
  /** Share of positive minus share of negative, -1 … 1. */
  net: number;
};

const EPS = 1e-9;

/** Bin index ranges for the three bands, given the thresholds. */
export function bandRanges(bands: Bands) {
  let negativeEnd = -1;
  let positiveStart = BINS;
  for (let bin = 0; bin < BINS; bin++) {
    const value = valueOfBin(bin);
    if (value <= bands.negative + EPS) negativeEnd = bin;
    if (positiveStart === BINS && value >= bands.positive - EPS) positiveStart = bin;
  }
  return { negativeEnd, positiveStart };
}

export function bandOf(value: number, bands: Bands): BandKey {
  if (value <= bands.negative + EPS) return "negative";
  if (value >= bands.positive - EPS) return "positive";
  return "neutral";
}

export function splitOf(binned: Binned, bands: Bands): Split {
  const { negativeEnd, positiveStart } = bandRanges(bands);
  let negative = 0;
  let neutral = 0;
  let positive = 0;
  for (let bin = 0; bin < BINS; bin++) {
    const n = binned.hist[bin];
    if (!n) continue;
    if (bin <= negativeEnd) negative += n;
    else if (bin >= positiveStart) positive += n;
    else neutral += n;
  }
  const count = binned.count;
  return {
    negative,
    neutral,
    positive,
    count,
    mean: count ? binned.sum / count : 0,
    net: count ? (positive - negative) / count : 0,
  };
}

export type SeriesPoint = Split & { t: number };

export function timeSeries(aggregate: Aggregate, bands: Bands, bucketMs: number): SeriesPoint[] {
  const width = Math.max(bucketMs, aggregate.bucketMs);
  const merged = new Map<number, { hist: Int32Array; count: number; sum: number }>();
  for (const bucket of aggregate.time) {
    const key = Math.floor(bucket.t / width) * width;
    let target = merged.get(key);
    if (!target) {
      target = { hist: new Int32Array(BINS), count: 0, sum: 0 };
      merged.set(key, target);
    }
    for (let i = 0; i < BINS; i++) target.hist[i] += bucket.hist[i];
    target.count += bucket.count;
    target.sum += bucket.sum;
  }
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, binned]) => ({ t, ...splitOf(binned, bands) }));
}

export type GroupRow = Split & { key: string };

export function groupRows(groups: GroupBin[], bands: Bands, limit: number): GroupRow[] {
  return groups.slice(0, limit).map((group) => ({ key: group.key, ...splitOf(group, bands) }));
}

export type HistogramBar = { value: number; label: string; count: number; band: BandKey };

/** The 201 fine bins collapsed to 0.05-wide bars, which is what reads well. */
export function histogramBars(binned: Binned, bands: Bands, step = 5): HistogramBar[] {
  const bars: HistogramBar[] = [];
  for (let start = 0; start < BINS; start += step) {
    let count = 0;
    for (let bin = start; bin < Math.min(start + step, BINS); bin++) count += binned.hist[bin];
    const centre = valueOfBin(Math.min(start + Math.floor(step / 2), BINS - 1));
    bars.push({
      value: centre,
      label: centre.toFixed(2),
      count,
      band: bandOf(centre, bands),
    });
  }
  return bars;
}

export type EmotionRow = { name: string; label: string; mean: number };

/**
 * Mean emotion score, optionally within one sentiment band. Emotion sums are
 * kept per sentiment bin precisely so this stays derivable.
 */
export function emotionRows(
  aggregate: Aggregate,
  bands: Bands,
  band: BandKey | "all",
): EmotionRow[] {
  const { names, sums, counts } = aggregate.emotions;
  if (!names.length) return [];
  const { negativeEnd, positiveStart } = bandRanges(bands);

  const inBand = (bin: number) => {
    if (band === "all") return true;
    if (band === "negative") return bin <= negativeEnd;
    if (band === "positive") return bin >= positiveStart;
    return bin > negativeEnd && bin < positiveStart;
  };

  let rows = 0;
  for (let bin = 0; bin < BINS; bin++) if (inBand(bin)) rows += counts[bin];
  if (!rows) return [];

  return names
    .map((name, e) => {
      let sum = 0;
      for (let bin = 0; bin < BINS; bin++) if (inBand(bin)) sum += sums[e * BINS + bin];
      return { name, label: emotionLabel(name), mean: sum / rows };
    })
    .sort((a, b) => b.mean - a.mean);
}

export type KeywordRow = GroupRow;

export function keywordRows(
  aggregate: Aggregate,
  bands: Bands,
  { limit, minCount, sort }: { limit: number; minCount: number; sort: "count" | "positive" | "negative" },
): KeywordRow[] {
  const rows = aggregate.keywords
    .filter((keyword) => keyword.count >= minCount)
    .map((keyword) => ({ key: keyword.key, ...splitOf(keyword, bands) }));

  if (sort === "positive") rows.sort((a, b) => b.net - a.net || b.count - a.count);
  else if (sort === "negative") rows.sort((a, b) => a.net - b.net || b.count - a.count);
  else rows.sort((a, b) => b.count - a.count);

  return rows.slice(0, limit);
}

/** Buckets where the negative share is unusually high, worst first. */
export function negativeSpikes(series: SeriesPoint[], minCount: number): SeriesPoint[] {
  return series
    .filter((point) => point.count >= minCount)
    .slice()
    .sort((a, b) => b.negative / b.count - a.negative / a.count)
    .slice(0, 3);
}
