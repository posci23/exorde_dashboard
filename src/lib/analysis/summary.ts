/**
 * The analysis as a CSV, so the numbers on screen can leave with the user —
 * one file holding the headline split, the trend, every breakdown and the
 * keyword table, each block labelled in its first column.
 */

import { groupRows, keywordRows, splitOf, timeSeries } from "./derive";
import { formatBucket } from "./format";
import type { Aggregate, Bands } from "./types";

function escape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function line(...cells: (string | number)[]): string {
  return cells.map(escape).join(",");
}

export function buildSummaryCsv(aggregate: Aggregate, bands: Bands, bucketMs: number): string {
  const total = splitOf(aggregate.total, bands);
  const rows: string[] = [];

  rows.push(line("section", "key", "count", "negative", "neutral", "positive", "mean", "net"));
  rows.push(line("file", aggregate.file.name, aggregate.stats.rowsRead));
  rows.push(line("bands", "thresholds", "", bands.negative, "", bands.positive));
  rows.push(
    line(
      "total",
      "all posts",
      total.count,
      total.negative,
      total.neutral,
      total.positive,
      total.mean.toFixed(4),
      total.net.toFixed(4),
    ),
  );

  rows.push(line("cleaning", "rows read", aggregate.stats.rowsRead));
  rows.push(line("cleaning", "rows scored", aggregate.stats.rowsKept));
  rows.push(line("cleaning", "no sentiment value", aggregate.stats.noSentiment));
  rows.push(line("cleaning", "malformed", aggregate.stats.malformed));
  rows.push(line("cleaning", "duplicates dropped", aggregate.stats.duplicates));
  rows.push(line("cleaning", "removed by filters", aggregate.stats.filteredOut));

  for (const point of timeSeries(aggregate, bands, bucketMs)) {
    rows.push(
      line(
        "trend",
        formatBucket(point.t, bucketMs),
        point.count,
        point.negative,
        point.neutral,
        point.positive,
        point.mean.toFixed(4),
        point.net.toFixed(4),
      ),
    );
  }

  const dimensions = ["domain", "language", "classification", "author"] as const;
  for (const dimension of dimensions) {
    for (const row of groupRows(aggregate.groups[dimension], bands, 50)) {
      rows.push(
        line(
          dimension,
          row.key,
          row.count,
          row.negative,
          row.neutral,
          row.positive,
          row.mean.toFixed(4),
          row.net.toFixed(4),
        ),
      );
    }
  }

  for (const row of keywordRows(aggregate, bands, { limit: 100, minCount: 2, sort: "count" })) {
    rows.push(
      line(
        "keyword",
        row.key,
        row.count,
        row.negative,
        row.neutral,
        row.positive,
        row.mean.toFixed(4),
        row.net.toFixed(4),
      ),
    );
  }

  return rows.join("\n");
}

/** Hand the CSV to the browser as a download, named after the source file. */
export function downloadSummaryCsv(aggregate: Aggregate, bands: Bands, bucketMs: number) {
  const csv = buildSummaryCsv(aggregate, bands, bucketMs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${aggregate.file.name.replace(/\.[^.]+$/, "")}-sentiment-summary.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
