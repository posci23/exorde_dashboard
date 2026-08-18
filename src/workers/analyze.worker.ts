/**
 * The parse runs here so a gigabyte file never blocks the page. The worker
 * owns the whole pass: read, clean, bin, reply once with the aggregate.
 */

/// <reference lib="webworker" />

import { analyzeFile } from "../lib/analysis/run";
import { routeScorer } from "../lib/analysis/scoring";
import type { WorkerRequest, WorkerResponse } from "../lib/analysis/types";

const worker = self as unknown as DedicatedWorkerGlobalScope;

function reply(message: WorkerResponse) {
  worker.postMessage(message);
}

worker.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { file, options, scoring } = event.data;
  try {
    const aggregate = await analyzeFile(
      file,
      options,
      (bytes, rowsRead) => {
        reply({ type: "progress", bytes, bytesTotal: file.size, rowsRead });
      },
      {
        scoring,
        // The provider's key lives on the server, so the worker scores through
        // this app's own route rather than calling the vendor.
        makeScorer: (config) =>
          routeScorer({
            providerId: config.providerId,
            label: config.providerId ?? "Scoring API",
            endpoint: new URL("/api/analysis/score", self.location.origin).toString(),
          }),
      },
    );
    reply({ type: "done", aggregate });
  } catch (error) {
    reply({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
