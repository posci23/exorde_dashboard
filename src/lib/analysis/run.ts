/**
 * One pass over a file: read rows, feed the aggregator, hand back the bins.
 * Shared by the worker and by the main-thread fallback, so both paths produce
 * byte-identical results.
 */

import { Aggregator } from "./aggregate";
import { readRows } from "./readers";
import type { Aggregate, CleanOptions } from "./types";

export async function analyzeFile(
  file: File,
  options: CleanOptions,
  onProgress?: (bytes: number, rowsRead: number) => void,
): Promise<Aggregate> {
  const aggregator = new Aggregator({ name: file.name, size: file.size }, options);
  let lastReport = 0;
  let bytesRead = 0;

  const report = () => {
    // Progress messages are throttled: a 10 M-row file would otherwise spend
    // more time posting updates than parsing.
    const now = Date.now();
    if (now - lastReport < 120) return;
    lastReport = now;
    onProgress?.(bytesRead, aggregator.rowsRead);
  };

  const outcome = await readRows(file, {
    headers: (headers) => aggregator.setHeaders(headers),
    row: (cells) => {
      aggregator.addRow(cells);
      if ((aggregator.rowsRead & 0x3fff) === 0) report();
    },
    progress: (bytes) => {
      // XLSX reports decompressed characters, which can exceed the file's own
      // size; the bar should never read past 100%.
      bytesRead = Math.min(bytes, file.size);
      aggregator.setProgress(bytes);
    },
  });

  aggregator.setProgress(file.size);
  onProgress?.(file.size, aggregator.rowsRead);
  return aggregator.finish(outcome.kind, outcome.gzipped, options.scale);
}

export type { Aggregate, CleanOptions };
