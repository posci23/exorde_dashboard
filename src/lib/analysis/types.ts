/**
 * Shared vocabulary for the drop-a-file sentiment analyzer.
 *
 * The whole pipeline is client-side: nothing here ever reaches the server, so
 * an export a user downloaded stays on their machine. That constraint shapes
 * the data model below — a file can be far larger than memory, so the parser
 * never keeps rows. It keeps *bins*: a 201-bucket sentiment histogram per
 * dimension (whole file, per hour, per domain, …). Everything the dashboard
 * draws is derived from those bins, which is why moving the neutral-band
 * sliders is instant while changing a cleaning rule needs a re-read.
 */

/** Sentiment histogram resolution: -1.00 … 1.00 in steps of 0.01. */
export const BINS = 201;

/** Bin index for a sentiment value, clamped to the histogram's range. */
export function binOf(value: number): number {
  const clamped = value < -1 ? -1 : value > 1 ? 1 : value;
  return Math.round((clamped + 1) * 100);
}

/** Midpoint sentiment value a bin represents. */
export function valueOfBin(bin: number): number {
  return bin / 100 - 1;
}

export type FileKind = "csv" | "tsv" | "json" | "jsonl" | "xlsx";

export type SentimentScale =
  /** Values already run -1 … 1, the shape the export ships in. */
  | "signed"
  /** Values run 0 … 1 (a positivity probability); rescaled to 2v-1. */
  | "unit"
  /** Column holds words — positive / negative / neutral — not numbers. */
  | "label";

/** Which column plays which role. Detected on a first pass, overridable. */
export type ColumnMapping = {
  sentiment: string | null;
  createdAt: string | null;
  text: string | null;
  domain: string | null;
  language: string | null;
  classification: string | null;
  classificationScore: string | null;
  author: string | null;
  url: string | null;
  keywords: string | null;
  id: string | null;
  /** Emotion columns found in the file, in file order. */
  emotions: string[];
};

/** Cleaning rules. Any change here forces a re-read of the file. */
export type CleanOptions = {
  /** Drop repeat rows sharing an id (falling back to url). */
  dedupe: boolean;
  /** Drop rows whose classification confidence is below this (0 = off). */
  minClassificationScore: number;
  /** Keep only these languages, lowercased. Empty = keep all. */
  languages: string[];
  /** Keep only these domains, lowercased. Empty = keep all. */
  domains: string[];
  /** ISO date (YYYY-MM-DD) lower bound on the timestamp column, or "". */
  from: string;
  /** ISO date (YYYY-MM-DD) upper bound, inclusive of the whole day, or "". */
  to: string;
  /** How to read the sentiment column. */
  scale: SentimentScale;
  /** Column role overrides; unset roles fall back to detection. */
  mapping: Partial<ColumnMapping>;
};

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
  dedupe: true,
  minClassificationScore: 0,
  languages: [],
  domains: [],
  from: "",
  to: "",
  scale: "signed",
  mapping: {},
};

/** Thresholds that split the sentiment line into three bands. */
export type Bands = {
  /** At or below this is negative. */
  negative: number;
  /** At or above this is positive. */
  positive: number;
};

export const DEFAULT_BANDS: Bands = { negative: -0.05, positive: 0.05 };

export type BandKey = "negative" | "neutral" | "positive";

/** A histogram plus the running totals needed for a mean. */
export type Binned = {
  hist: Int32Array;
  count: number;
  sum: number;
};

export type GroupBin = Binned & { key: string };

export type TimeBin = Binned & { t: number };

export type SamplePostRow = {
  t: number | null;
  sentiment: number;
  text: string;
  domain: string;
  language: string;
  classification: string;
  author: string;
  url: string;
};

/** What the parser skipped, and why. Shown as a cleaning report. */
export type CleanStats = {
  bytes: number;
  bytesTotal: number;
  rowsRead: number;
  rowsKept: number;
  noSentiment: number;
  malformed: number;
  duplicates: number;
  filteredOut: number;
  /** True once the dedupe index hit its cap and stopped growing. */
  dedupeSaturated: boolean;
  withTimestamp: number;
  withText: number;
  negativeSeen: boolean;
  truncated: boolean;
};

/** Everything one pass over a file produces. Bins, never rows. */
export type Aggregate = {
  file: { name: string; size: number; kind: FileKind; gzipped: boolean };
  columns: string[];
  mapping: ColumnMapping;
  scale: SentimentScale;
  stats: CleanStats;
  total: Binned & { min: number; max: number };
  /** Bucket width in ms — hourly unless the span forced a coarser roll-up. */
  bucketMs: number;
  time: TimeBin[];
  groups: {
    domain: GroupBin[];
    language: GroupBin[];
    classification: GroupBin[];
    author: GroupBin[];
  };
  /** Emotion means, kept per sentiment bin so band averages stay derivable. */
  emotions: { names: string[]; sums: Float64Array; counts: Int32Array };
  keywords: GroupBin[];
  samples: SamplePostRow[];
  extremes: { top: SamplePostRow[]; bottom: SamplePostRow[] };
};

export type WorkerRequest = {
  type: "analyze";
  file: File;
  options: CleanOptions;
};

export type WorkerResponse =
  | { type: "progress"; bytes: number; bytesTotal: number; rowsRead: number }
  | { type: "done"; aggregate: Aggregate }
  | { type: "error"; message: string };
