/**
 * The parse runs here so a gigabyte file never blocks the page. The worker
 * owns the whole pass: read, clean, bin, reply once with the aggregate.
 */

/// <reference lib="webworker" />

import { analyzeFile } from "../lib/analysis/run";
import type { WorkerRequest, WorkerResponse } from "../lib/analysis/types";

const worker = self as unknown as DedicatedWorkerGlobalScope;

function reply(message: WorkerResponse) {
  worker.postMessage(message);
}

worker.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { file, options } = event.data;
  try {
    const aggregate = await analyzeFile(file, options, (bytes, rowsRead) => {
      reply({ type: "progress", bytes, bytesTotal: file.size, rowsRead });
    });
    reply({ type: "done", aggregate });
  } catch (error) {
    reply({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
