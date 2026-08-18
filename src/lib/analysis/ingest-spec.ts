/**
 * What to ingest. Shared by the browser and the route — kept apart from
 * `ingest.ts`, which imports Node's DNS resolver and must not reach a client
 * bundle.
 */

export type IngestSpec =
  | { kind: "job"; jobId: string }
  | { kind: "url"; url: string };

/** How the analyzer was fed. "file" never leaves the browser. */
export type SourceKind = "file" | "job" | "url";
