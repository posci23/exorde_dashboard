/**
 * File readers. Every one of them streams: a 4 GB export is read chunk by
 * chunk and never held in memory, because the aggregator downstream only
 * keeps counters.
 *
 * All readers speak the same shape — a header row once, then cell arrays
 * aligned to it — so the aggregator does not care which format it got.
 */

import { byteStream } from "./stream";
import type { FileKind } from "./types";
import { readXlsxRows } from "./xlsx";

export type RowSink = {
  headers: (headers: string[]) => void;
  /** Cells in header order. Missing trailing cells simply aren't there. */
  row: (cells: unknown[]) => void;
  progress: (bytesRead: number) => void;
};

export type ReadOutcome = { kind: FileKind; gzipped: boolean };

/** Extension → format, after stripping a trailing `.gz`. */
export function detectKind(fileName: string): FileKind | null {
  const name = fileName.toLowerCase().replace(/\.gz$/, "");
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".tsv") || name.endsWith(".tab")) return "tsv";
  if (name.endsWith(".jsonl") || name.endsWith(".ndjson")) return "jsonl";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) return "xlsx";
  return null;
}

export const ACCEPTED_EXTENSIONS = ".csv,.tsv,.json,.jsonl,.ndjson,.xlsx,.xlsm,.gz";

async function isGzipped(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return head[0] === 0x1f && head[1] === 0x8b;
}

/** Text chunks from a file, counting *stored* bytes so progress is honest. */
async function* textChunks(
  file: Blob,
  gzipped: boolean,
  onBytes: (bytes: number) => void,
): AsyncGenerator<string> {
  let stream = byteStream(file, onBytes);
  if (gzipped) stream = stream.pipeThrough(new DecompressionStream("gzip"));

  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

const DELIMITERS = [",", ";", "\t", "|"] as const;

/** Pick the delimiter that appears most often outside quotes on line one. */
function sniffDelimiter(sample: string, kind: FileKind): string {
  if (kind === "tsv") return "\t";
  const line = sample.split(/\r?\n/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * RFC 4180 parser driven one chunk at a time: quoted fields, doubled quotes,
 * embedded newlines and CRLF all survive a chunk boundary because the field
 * and quote state live across calls.
 *
 * Text is copied a run at a time rather than a character at a time — on a
 * gigabyte file that difference is minutes.
 */
class CsvState {
  private field = "";
  private row: string[] = [];
  private inQuotes = false;
  /** A quote was seen inside a quoted field; the next char says what it meant. */
  private pendingQuote = false;
  private started = false;
  private readonly delimiterCode: number;

  constructor(
    private readonly delimiter: string,
    private readonly emit: (row: string[]) => void,
  ) {
    this.delimiterCode = delimiter.charCodeAt(0);
  }

  push(chunk: string) {
    const length = chunk.length;
    let i = 0;

    while (i < length) {
      if (this.pendingQuote) {
        this.pendingQuote = false;
        if (chunk[i] === '"') {
          // "" inside a quoted field is one literal quote.
          this.field += '"';
          i++;
          continue;
        }
        this.inQuotes = false;
        continue;
      }

      if (this.inQuotes) {
        const quote = chunk.indexOf('"', i);
        if (quote < 0) {
          this.field += chunk.slice(i);
          return;
        }
        this.field += chunk.slice(i, quote);
        i = quote + 1;
        this.pendingQuote = true;
        continue;
      }

      // Copy the plain run up to the next character that means something.
      let j = i;
      while (j < length) {
        const code = chunk.charCodeAt(j);
        if (code === this.delimiterCode || code === 10 || code === 13 || code === 34) break;
        j++;
      }
      if (j > i) {
        this.field += chunk.slice(i, j);
        this.started = true;
        i = j;
        continue;
      }

      const char = chunk[i];
      i++;
      if (char === '"') {
        if (this.field === "") this.inQuotes = true;
        else this.field += '"';
        this.started = true;
      } else if (char === this.delimiter) {
        this.row.push(this.field);
        this.field = "";
        this.started = true;
      } else if (char === "\n") {
        this.flushRow();
      }
      // A lone \r is line-ending noise; \r\n is handled by the \n above.
    }
  }

  private flushRow() {
    this.row.push(this.field);
    this.field = "";
    // A trailing newline should not emit a phantom row.
    if (this.row.length > 1 || this.row[0] !== "" || this.started) this.emit(this.row);
    this.row = [];
    this.started = false;
  }

  finish() {
    if (this.inQuotes || this.pendingQuote || this.field !== "" || this.row.length > 0) {
      this.flushRow();
    }
  }
}

async function readDelimited(
  file: Blob,
  kind: FileKind,
  gzipped: boolean,
  sink: RowSink,
): Promise<void> {
  let headers: string[] | null = null;
  let state: CsvState | null = null;
  let first = "";

  const emit = (cells: string[]) => {
    if (!headers) {
      headers = cells.map((h, i) => h.trim().replace(/^﻿/, "") || `column_${i + 1}`);
      sink.headers(headers);
      return;
    }
    // A row of one empty cell is a blank line, not a record.
    if (cells.length === 1 && cells[0] === "") return;
    sink.row(cells);
  };

  for await (const chunk of textChunks(file, gzipped, sink.progress)) {
    if (!state) {
      first += chunk;
      // Wait for a full first line before committing to a delimiter.
      if (!first.includes("\n") && first.length < 1_000_000) continue;
      state = new CsvState(sniffDelimiter(first, kind), emit);
      state.push(first.replace(/^﻿/, ""));
      first = "";
      continue;
    }
    state.push(chunk);
  }

  if (!state && first) {
    state = new CsvState(sniffDelimiter(first, kind), emit);
    state.push(first.replace(/^﻿/, ""));
  }
  state?.finish();
}

/**
 * Objects don't announce their columns, so the first records are buffered to
 * learn the key set, then everything is emitted in that order. Keys that only
 * show up later are ignored — by then the dashboard's column mapping is fixed.
 */
class ObjectRows {
  private buffered: Record<string, unknown>[] = [];
  private headers: string[] | null = null;
  private readonly seen = new Set<string>();

  constructor(
    private readonly sink: RowSink,
    private readonly sampleSize = 200,
  ) {}

  push(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const record = flatten(value as Record<string, unknown>);

    if (this.headers) {
      this.sink.row(this.headers.map((key) => record[key]));
      return;
    }
    for (const key of Object.keys(record)) this.seen.add(key);
    this.buffered.push(record);
    if (this.buffered.length >= this.sampleSize) this.commit();
  }

  private commit() {
    if (this.headers) return;
    this.headers = [...this.seen];
    this.sink.headers(this.headers);
    for (const record of this.buffered) {
      this.sink.row(this.headers.map((key) => record[key]));
    }
    this.buffered = [];
  }

  finish() {
    this.commit();
  }
}

/** One level of nesting becomes `parent.child`, so `analysis.sentiment` maps. */
function flatten(record: Record<string, unknown>): Record<string, unknown> {
  let nested = false;
  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      nested = true;
      break;
    }
  }
  if (!nested) return record;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        out[`${key}.${childKey}`] = childValue;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Handles both JSON shapes people actually have: one object per line, or a
 * single top-level array. The array case is scanned by brace depth so elements
 * are parsed one at a time instead of materialising the whole document.
 */
async function readJson(file: Blob, gzipped: boolean, sink: RowSink): Promise<FileKind> {
  const rows = new ObjectRows(sink);
  let mode: "unknown" | "array" | "lines" = "unknown";
  let buffer = "";

  // Array-scanner state, carried across chunks.
  let depth = 0;
  let inString = false;
  let escaped = false;
  let elementStart = -1;

  const pushLines = (final: boolean) => {
    let cut = 0;
    for (;;) {
      const newline = buffer.indexOf("\n", cut);
      if (newline < 0) break;
      const line = buffer.slice(cut, newline).trim().replace(/,$/, "");
      cut = newline + 1;
      if (line) safeParse(line, rows);
    }
    buffer = buffer.slice(cut);
    if (final && buffer.trim()) {
      safeParse(buffer.trim().replace(/,$/, ""), rows);
      buffer = "";
    }
  };

  const pushArray = () => {
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{" || char === "[") {
        depth++;
        if (depth === 2 && elementStart < 0) elementStart = i;
        continue;
      }
      if (char === "}" || char === "]") {
        depth--;
        if (depth === 1 && elementStart >= 0) {
          safeParse(buffer.slice(elementStart, i + 1), rows);
          elementStart = -1;
        }
        continue;
      }
    }
    // Keep only what an unfinished element still needs.
    if (elementStart >= 0) {
      buffer = buffer.slice(elementStart);
      elementStart = 0;
    } else {
      buffer = "";
    }
  };

  for await (const chunk of textChunks(file, gzipped, sink.progress)) {
    buffer += chunk;
    if (mode === "unknown") {
      const head = buffer.replace(/^\s+/, "");
      if (!head) continue;
      if (head[0] === "[") {
        mode = "array";
        buffer = head;
      } else {
        mode = "lines";
      }
    }
    if (mode === "array") pushArray();
    else pushLines(false);
  }

  if (mode === "array") pushArray();
  else pushLines(true);

  rows.finish();
  return mode === "array" ? "json" : "jsonl";
}

function safeParse(text: string, rows: ObjectRows) {
  try {
    rows.push(JSON.parse(text));
  } catch {
    // A malformed record is counted by the aggregator's own guard; skipping it
    // here keeps one bad line from ending the whole read.
  }
}

async function readXlsx(file: Blob, sink: RowSink): Promise<void> {
  let headers: string[] | null = null;
  await readXlsxRows(
    file,
    (cells) => {
      if (!headers) {
        headers = cells.map((h, i) => String(h).trim() || `column_${i + 1}`);
        sink.headers(headers);
        return;
      }
      if (cells.every((cell) => cell === "")) return;
      sink.row(cells);
    },
    sink.progress,
  );
}

/** Read any supported file, dispatching on extension and gzip magic bytes. */
export async function readRows(file: File, sink: RowSink): Promise<ReadOutcome> {
  const kind = detectKind(file.name);
  const gzipped = kind === "xlsx" ? false : await isGzipped(file);

  if (kind === "xlsx") {
    await readXlsx(file, sink);
    return { kind: "xlsx", gzipped: false };
  }
  if (kind === "json" || kind === "jsonl") {
    const resolved = await readJson(file, gzipped, sink);
    return { kind: resolved, gzipped };
  }
  if (kind === "csv" || kind === "tsv") {
    await readDelimited(file, kind, gzipped, sink);
    return { kind, gzipped };
  }

  // No usable extension: let the first bytes decide.
  const head = (await file.slice(0, 4096).text()).replace(/^﻿\s*/, "");
  if (head.startsWith("[") || head.startsWith("{")) {
    const resolved = await readJson(file, gzipped, sink);
    return { kind: resolved, gzipped };
  }
  await readDelimited(file, "csv", gzipped, sink);
  return { kind: "csv", gzipped };
}
