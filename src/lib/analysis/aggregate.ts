/**
 * The aggregator: rows in, bins out.
 *
 * Nothing per-row survives except a small sample and the extremes, so memory
 * is flat whether the file has fifty rows or fifty million. Every number the
 * dashboard shows — band split, trend, breakdowns, emotion profile — comes
 * out of the histograms built here, which is why re-cutting the neutral band
 * needs no second pass over the file.
 */

import {
  BINS,
  binOf,
  type Aggregate,
  type Binned,
  type CleanOptions,
  type CleanStats,
  type ColumnMapping,
  type FileKind,
  type GroupBin,
  type SamplePostRow,
  type SentimentScale,
} from "./types";
import {
  detectMapping,
  readKeywords,
  readNumber,
  readSentiment,
  readTimestamp,
} from "./columns";

const GROUP_LIMIT = 300;
const KEYWORD_LIMIT = 1500;
const SAMPLE_SIZE = 400;
const EXTREME_SIZE = 25;
const DEDUPE_LIMIT = 2_000_000;
const MAX_TIME_BUCKETS = 20_000;
const MAX_ROWS = 20_000_000;
const MAX_EMOTIONS = 40;
const HOUR_MS = 3_600_000;

/**
 * Keyword extraction on social text always surfaces the same platform debris.
 * Dropping it here rather than in the chart keeps the tracked-keyword budget
 * for words that mean something.
 */
const KEYWORD_NOISE = new Set([
  "rt",
  "http",
  "https",
  "https ://",
  "http ://",
  "co",
  "t co",
  "www",
  "com",
  "amp",
]);

function emptyBinned(): Binned {
  return { hist: new Int32Array(BINS), count: 0, sum: 0 };
}

/**
 * Counts keyed by a string — domains, languages, keywords. Tracking is capped:
 * once the map outgrows twice its limit the long tail of one-hit keys is
 * dropped, which keeps memory bounded on a file with millions of distinct
 * authors while leaving the leaders (the only ones ever charted) intact.
 */
class BinMap {
  private readonly map = new Map<string, Binned>();

  constructor(private readonly limit: number) {}

  add(key: string, value: number, bin: number) {
    let entry = this.map.get(key);
    if (!entry) {
      if (this.map.size >= this.limit * 2) this.prune();
      entry = emptyBinned();
      this.map.set(key, entry);
    }
    entry.hist[bin]++;
    entry.count++;
    entry.sum += value;
  }

  private prune() {
    const ranked = [...this.map.entries()].sort((a, b) => b[1].count - a[1].count);
    this.map.clear();
    for (const [key, entry] of ranked.slice(0, this.limit)) this.map.set(key, entry);
  }

  top(n: number): GroupBin[] {
    return [...this.map.entries()]
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }
}

export type FileMeta = { name: string; size: number };

export class Aggregator {
  private mapping: ColumnMapping | null = null;
  private columns: string[] = [];
  private index: Record<string, number> = {};
  private emotionIndex: number[] = [];
  private emotionNames: string[] = [];

  private readonly total = { ...emptyBinned(), min: Infinity, max: -Infinity };
  private readonly time = new Map<number, Binned>();
  private bucketMs = HOUR_MS;

  private readonly domains = new BinMap(GROUP_LIMIT);
  private readonly languages = new BinMap(GROUP_LIMIT);
  private readonly classifications = new BinMap(GROUP_LIMIT);
  private readonly authors = new BinMap(GROUP_LIMIT);
  private readonly keywords = new BinMap(KEYWORD_LIMIT);

  private emotionSums = new Float64Array(0);
  private readonly emotionCounts = new Int32Array(BINS);

  private readonly samples: SamplePostRow[] = [];
  private top: SamplePostRow[] = [];
  private bottom: SamplePostRow[] = [];

  private readonly seenIds = new Set<string>();
  private eligible = 0;

  private readonly stats: CleanStats = {
    bytes: 0,
    bytesTotal: 0,
    rowsRead: 0,
    rowsKept: 0,
    noSentiment: 0,
    malformed: 0,
    duplicates: 0,
    filteredOut: 0,
    dedupeSaturated: false,
    withTimestamp: 0,
    withText: 0,
    negativeSeen: false,
    truncated: false,
  };

  private readonly languageFilter: Set<string>;
  private readonly domainFilter: Set<string>;
  private readonly fromMs: number | null;
  private readonly toMs: number | null;

  constructor(
    private readonly file: FileMeta,
    private readonly options: CleanOptions,
  ) {
    this.stats.bytesTotal = file.size;
    this.languageFilter = new Set(options.languages.map((l) => l.toLowerCase()));
    this.domainFilter = new Set(options.domains.map((d) => d.toLowerCase()));
    this.fromMs = options.from ? Date.parse(`${options.from}T00:00:00Z`) : null;
    // `to` is inclusive of the whole day people picked, not midnight sharp.
    this.toMs = options.to ? Date.parse(`${options.to}T23:59:59.999Z`) : null;
  }

  setHeaders(headers: string[]) {
    this.columns = headers;
    this.mapping = detectMapping(headers, this.options.mapping);
    this.index = {};
    headers.forEach((header, i) => {
      if (!(header in this.index)) this.index[header] = i;
    });
    this.emotionNames = this.mapping.emotions.slice(0, MAX_EMOTIONS);
    this.emotionIndex = this.emotionNames.map((name) => this.index[name] ?? -1);
    this.emotionSums = new Float64Array(this.emotionNames.length * BINS);
  }

  setProgress(bytes: number) {
    this.stats.bytes = bytes;
  }

  get rowsRead(): number {
    return this.stats.rowsRead;
  }

  get done(): boolean {
    return this.stats.truncated;
  }

  addRow(cells: unknown[]) {
    if (!this.mapping || this.stats.truncated) return;
    this.stats.rowsRead++;
    if (this.stats.rowsRead > MAX_ROWS) {
      this.stats.truncated = true;
      return;
    }

    const sentimentColumn = this.mapping.sentiment;
    if (!sentimentColumn) {
      this.stats.noSentiment++;
      return;
    }

    const raw = this.cell(cells, sentimentColumn);
    const sentiment = readSentiment(raw, this.options.scale);
    if (sentiment == null) {
      // A row with no score is not a neutral row — it is a row we can't judge.
      if (cells.length <= 1) this.stats.malformed++;
      else this.stats.noSentiment++;
      return;
    }

    const language = this.text(cells, this.mapping.language).toLowerCase();
    const domain = this.text(cells, this.mapping.domain).toLowerCase();
    if (this.languageFilter.size && !this.languageFilter.has(language)) {
      this.stats.filteredOut++;
      return;
    }
    if (this.domainFilter.size && !this.domainFilter.has(domain)) {
      this.stats.filteredOut++;
      return;
    }

    if (this.options.minClassificationScore > 0) {
      const score = readNumber(this.cell(cells, this.mapping.classificationScore));
      if (score == null || score < this.options.minClassificationScore) {
        this.stats.filteredOut++;
        return;
      }
    }

    const t = readTimestamp(this.cell(cells, this.mapping.createdAt));
    if ((this.fromMs != null || this.toMs != null) && t == null) {
      this.stats.filteredOut++;
      return;
    }
    if (t != null && ((this.fromMs != null && t < this.fromMs) || (this.toMs != null && t > this.toMs))) {
      this.stats.filteredOut++;
      return;
    }

    if (this.options.dedupe) {
      const id = this.text(cells, this.mapping.id) || this.text(cells, this.mapping.url);
      if (id) {
        if (this.seenIds.has(id)) {
          this.stats.duplicates++;
          return;
        }
        if (this.seenIds.size < DEDUPE_LIMIT) this.seenIds.add(id);
        else this.stats.dedupeSaturated = true;
      }
    }

    const bin = binOf(sentiment);
    this.stats.rowsKept++;
    if (sentiment < 0) this.stats.negativeSeen = true;
    this.total.hist[bin]++;
    this.total.count++;
    this.total.sum += sentiment;
    if (sentiment < this.total.min) this.total.min = sentiment;
    if (sentiment > this.total.max) this.total.max = sentiment;

    if (t != null) {
      this.stats.withTimestamp++;
      this.addTime(t, sentiment, bin);
    }

    if (domain) this.domains.add(domain, sentiment, bin);
    if (language) this.languages.add(language, sentiment, bin);
    const classification = this.text(cells, this.mapping.classification);
    if (classification) this.classifications.add(classification.toLowerCase(), sentiment, bin);
    const author = this.text(cells, this.mapping.author);
    if (author) this.authors.add(author, sentiment, bin);

    if (this.mapping.keywords) {
      for (const keyword of readKeywords(this.cell(cells, this.mapping.keywords))) {
        const clean = keyword.toLowerCase().trim();
        if (clean.length > 1 && !KEYWORD_NOISE.has(clean) && /[a-z0-9]/.test(clean)) {
          this.keywords.add(clean, sentiment, bin);
        }
      }
    }

    if (this.emotionNames.length) {
      let any = false;
      for (let e = 0; e < this.emotionIndex.length; e++) {
        const value = readNumber(cells[this.emotionIndex[e]]);
        if (value == null) continue;
        any = true;
        this.emotionSums[e * BINS + bin] += value;
      }
      if (any) this.emotionCounts[bin]++;
    }

    const text = this.text(cells, this.mapping.text);
    if (text) this.stats.withText++;
    this.collectSample({
      t,
      sentiment,
      text: text.slice(0, 400),
      domain,
      language,
      classification,
      author,
      url: this.text(cells, this.mapping.url),
    });
  }

  /**
   * Hourly buckets, rolled up if a file spans so long that hours would blow
   * past the cap (an unfiltered multi-year archive, say).
   */
  private addTime(t: number, sentiment: number, bin: number) {
    const key = Math.floor(t / this.bucketMs) * this.bucketMs;
    let bucket = this.time.get(key);
    if (!bucket) {
      bucket = emptyBinned();
      this.time.set(key, bucket);
    }
    bucket.hist[bin]++;
    bucket.count++;
    bucket.sum += sentiment;
    if (this.time.size > MAX_TIME_BUCKETS) this.coarsenTime();
  }

  private coarsenTime() {
    const nextWidth = this.bucketMs < 86_400_000 ? 86_400_000 : this.bucketMs * 7;
    const merged = new Map<number, Binned>();
    for (const [key, bucket] of this.time) {
      const next = Math.floor(key / nextWidth) * nextWidth;
      const target = merged.get(next) ?? emptyBinned();
      for (let i = 0; i < BINS; i++) target.hist[i] += bucket.hist[i];
      target.count += bucket.count;
      target.sum += bucket.sum;
      merged.set(next, target);
    }
    this.time.clear();
    for (const [key, bucket] of merged) this.time.set(key, bucket);
    this.bucketMs = nextWidth;
  }

  /** Uniform reservoir sample, plus the strongest rows at either end. */
  private collectSample(row: SamplePostRow) {
    this.eligible++;
    if (this.samples.length < SAMPLE_SIZE) {
      this.samples.push(row);
    } else {
      const slot = Math.floor(Math.random() * this.eligible);
      if (slot < SAMPLE_SIZE) this.samples[slot] = row;
    }

    if (!row.text) return;
    insertRanked(this.top, row, EXTREME_SIZE, (a, b) => b.sentiment - a.sentiment);
    insertRanked(this.bottom, row, EXTREME_SIZE, (a, b) => a.sentiment - b.sentiment);
  }

  private cell(cells: unknown[], column: string | null): unknown {
    if (!column) return null;
    const i = this.index[column];
    return i == null ? null : cells[i];
  }

  private text(cells: unknown[], column: string | null): string {
    const value = this.cell(cells, column);
    if (value == null) return "";
    const text = String(value).trim();
    return text === "null" || text === "undefined" || text === "NaN" ? "" : text;
  }

  finish(kind: FileKind, gzipped: boolean, scale: SentimentScale): Aggregate {
    const mapping =
      this.mapping ??
      detectMapping(this.columns, this.options.mapping);

    const time = [...this.time.entries()]
      .map(([t, bucket]) => ({ t, ...bucket }))
      .sort((a, b) => a.t - b.t);

    return {
      file: { name: this.file.name, size: this.file.size, kind, gzipped },
      columns: this.columns,
      mapping,
      scale,
      stats: this.stats,
      total: {
        hist: this.total.hist,
        count: this.total.count,
        sum: this.total.sum,
        min: this.total.count ? this.total.min : 0,
        max: this.total.count ? this.total.max : 0,
      },
      bucketMs: this.bucketMs,
      time,
      groups: {
        domain: this.domains.top(GROUP_LIMIT),
        language: this.languages.top(GROUP_LIMIT),
        classification: this.classifications.top(GROUP_LIMIT),
        author: this.authors.top(GROUP_LIMIT),
      },
      emotions: {
        names: this.emotionNames,
        sums: this.emotionSums,
        counts: this.emotionCounts,
      },
      keywords: this.keywords.top(KEYWORD_LIMIT),
      samples: this.samples,
      extremes: { top: this.top, bottom: this.bottom },
    };
  }
}

function insertRanked(
  list: SamplePostRow[],
  row: SamplePostRow,
  limit: number,
  compare: (a: SamplePostRow, b: SamplePostRow) => number,
) {
  if (list.length >= limit && compare(row, list[list.length - 1]) >= 0) return;
  list.push(row);
  list.sort(compare);
  if (list.length > limit) list.length = limit;
}
