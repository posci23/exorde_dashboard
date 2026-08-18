"use client";

/**
 * Browser side of server ingest.
 *
 * The route answers in NDJSON: a line per progress tick, then one line
 * carrying the aggregate. Reading it as a stream means the same progress bar
 * the in-browser worker drives, without polling a job endpoint.
 */

import type { Progress } from "./client";
import type { IngestSpec } from "./ingest-spec";
import type { ScoringOptions } from "./scoring";
import type { Aggregate, CleanOptions } from "./types";
import { unpackAggregate, type WireAggregate } from "./wire";

export type IngestRequest = {
  source: IngestSpec;
  options: CleanOptions;
  scoring: ScoringOptions;
};

export type IngestRun = {
  result: Promise<Aggregate>;
  cancel: () => void;
};

export function startIngest(
  request: IngestRequest,
  onProgress: (progress: Progress) => void,
): IngestRun {
  const controller = new AbortController();

  const result = (async () => {
    const response = await fetch("/api/analysis/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(errorFrom(detail, response.status));
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let aggregate: Aggregate | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!line) continue;

        const message = JSON.parse(line) as
          | { type: "opened"; name: string; size: number }
          | { type: "progress"; bytes: number; bytesTotal: number; rowsRead: number }
          | { type: "done"; aggregate: WireAggregate }
          | { type: "error"; message: string };

        if (message.type === "progress") onProgress(message);
        else if (message.type === "error") throw new Error(message.message);
        else if (message.type === "done") aggregate = unpackAggregate(message.aggregate);
      }
    }

    if (!aggregate) throw new Error("The ingest ended before it produced an analysis.");
    return aggregate;
  })();

  return { result, cancel: () => controller.abort() };
}

/** Route errors come back as this app's usual `{ ok, error: { detail } }`. */
function errorFrom(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body);
    const detail = (parsed as { error?: { detail?: string } })?.error?.detail;
    if (detail) return detail;
  } catch {
    // Not JSON — fall through to the status line.
  }
  return `Ingest failed (${status}).`;
}
