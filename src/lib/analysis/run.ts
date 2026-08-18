/**
 * One pass over a source: read rows, score them, feed the aggregator, hand
 * back the bins.
 *
 * Shared by every caller — the browser worker, the main-thread fallback, and
 * the server-side ingest route — so a file dropped in the page and the same
 * file pulled straight from the export API produce identical numbers.
 */

import { Aggregator } from "./aggregate";
import { readRows } from "./readers";
import { fileSource, type AnalysisSource } from "./source";
import { scoreAll, type Scorer, type ScoringOptions } from "./scoring";
import type { Aggregate, CleanOptions } from "./types";

export type AnalyzeHooks = {
  onProgress?: (bytesRead: number, rowsRead: number) => void;
  /** Aborts the read at the next chunk boundary. */
  signal?: AbortSignal;
  /** Supplies the scorer when `scoring.mode` is "api". */
  scoring?: ScoringOptions;
  makeScorer?: (options: ScoringOptions) => Scorer | null;
};

export async function analyzeSource(
  source: AnalysisSource,
  options: CleanOptions,
  hooks: AnalyzeHooks = {},
): Promise<Aggregate> {
  const aggregator = new Aggregator({ name: source.name, size: source.size }, options);
  const scoring = hooks.scoring;
  const scorer =
    scoring?.mode === "api" ? (hooks.makeScorer?.(scoring) ?? null) : null;

  let bytesRead = 0;
  let lastReport = 0;
  let stopped = false;

  const report = (force = false) => {
    // Progress messages are throttled: a 10 M-row file would otherwise spend
    // more time posting updates than parsing.
    const now = Date.now();
    if (!force && now - lastReport < 120) return;
    lastReport = now;
    hooks.onProgress?.(bytesRead, aggregator.rowsRead);
  };

  /** Rows waiting on the scoring API, held only between chunk boundaries. */
  const pending: unknown[][] = [];
  let scoredSoFar = 0;
  let scoredOk = 0;
  let scoringError: unknown = null;

  async function drain() {
    if (!scorer || pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    const room = Math.max(0, (scoring?.maxRows ?? 0) - scoredSoFar);

    const toScore = batch.slice(0, room);
    const overflow = batch.length - toScore.length;
    if (overflow > 0) aggregator.countUnscored(overflow);

    if (toScore.length === 0) {
      // The ceiling is spent; reading on would cost time for nothing.
      stopped = true;
      return;
    }

    const scores = await scoreAll(
      scorer,
      toScore.map((cells) => aggregator.textFor(cells)),
      hooks.signal,
      (error) => {
        scoringError ??= error;
      },
    );
    scoredSoFar += toScore.length;
    for (let i = 0; i < toScore.length; i++) {
      if (scores[i] != null) scoredOk++;
      aggregator.addRow(toScore[i], scores[i], true);
    }
    if (scoredSoFar >= (scoring?.maxRows ?? Infinity)) stopped = true;
    report(true);
  }

  const outcome = await readRows(source, {
    headers: (headers) => aggregator.setHeaders(headers),
    row: (cells) => {
      if (scorer) {
        // Rows are counted on arrival and added once their score comes back.
        if (!aggregator.countRead()) return;
        const text = aggregator.textFor(cells);
        if (!text) {
          aggregator.countUnscored();
          return;
        }
        pending.push(cells);
        return;
      }
      aggregator.addRow(cells);
      if ((aggregator.rowsRead & 0x3fff) === 0) report();
    },
    progress: (bytes) => {
      // XLSX reports decompressed characters, which can exceed the file's own
      // size; the bar should never read past 100%.
      bytesRead = source.size ? Math.min(bytes, source.size) : bytes;
      aggregator.setProgress(bytesRead);
    },
    afterChunk: async () => {
      await drain();
      report();
    },
    shouldStop: () => stopped || hooks.signal?.aborted === true,
  });

  // Whatever the last chunk left behind still deserves a score.
  await drain();

  // Every batch failing is a broken configuration, not a quiet column of
  // blanks — surface the provider's own words rather than an empty dashboard.
  if (scorer && scoredSoFar > 0 && scoredOk === 0) {
    const detail = scoringError instanceof Error ? scoringError.message : null;
    throw new Error(
      detail
        ? `Scoring failed for every row: ${detail}`
        : "Scoring failed for every row: the API returned no usable scores.",
    );
  }

  aggregator.setProgress(source.size || bytesRead);
  hooks.onProgress?.(source.size || bytesRead, aggregator.rowsRead);
  return aggregator.finish(outcome.kind, outcome.gzipped, options.scale);
}

/** The browser's entry point, where the source is always a dropped file. */
export function analyzeFile(
  file: File,
  options: CleanOptions,
  onProgress?: (bytesRead: number, rowsRead: number) => void,
  hooks: Omit<AnalyzeHooks, "onProgress"> = {},
): Promise<Aggregate> {
  return analyzeSource(fileSource(file), options, { ...hooks, onProgress });
}

export type { Aggregate, CleanOptions };
