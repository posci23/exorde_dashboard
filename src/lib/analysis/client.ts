"use client";

/**
 * Browser-side entry point for the analyzer.
 *
 * The work belongs in a worker — a big file would otherwise freeze the page
 * for a minute — but a worker is not guaranteed (an old browser, a strict CSP,
 * a bundler that didn't emit the chunk), so a main-thread run stands behind it.
 * The two share `analyzeFile`, so the numbers are identical either way.
 */

import { analyzeFile } from "./run";
import { routeScorer, type ScoringOptions } from "./scoring";
import type { Aggregate, CleanOptions, WorkerResponse } from "./types";

export type Progress = { bytes: number; bytesTotal: number; rowsRead: number };

export type AnalysisRun = {
  result: Promise<Aggregate>;
  cancel: () => void;
};

export function startAnalysis(
  file: File,
  options: CleanOptions,
  scoring: ScoringOptions,
  onProgress: (progress: Progress) => void,
): AnalysisRun {
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL("../../workers/analyze.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    worker = null;
  }

  if (!worker) {
    let cancelled = false;
    const result = analyzeFile(
      file,
      options,
      (bytes, rowsRead) => {
        if (!cancelled) onProgress({ bytes, bytesTotal: file.size, rowsRead });
      },
      {
        scoring,
        makeScorer: (config) =>
          routeScorer({ providerId: config.providerId, label: config.providerId ?? "Scoring API" }),
      },
    ).then((aggregate) => {
      if (cancelled) throw new DOMException("Analysis cancelled", "AbortError");
      return aggregate;
    });
    return { result, cancel: () => { cancelled = true; } };
  }

  const active = worker;
  const result = new Promise<Aggregate>((resolve, reject) => {
    active.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        onProgress(message);
        return;
      }
      active.terminate();
      if (message.type === "done") resolve(message.aggregate);
      else reject(new Error(message.message));
    };
    active.onerror = (event) => {
      active.terminate();
      reject(new Error(event.message || "The analyzer worker failed."));
    };
    active.postMessage({ type: "analyze", file, options, scoring });
  });

  return {
    result,
    cancel: () => {
      active.onmessage = null;
      active.terminate();
    },
  };
}
