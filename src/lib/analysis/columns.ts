/**
 * Column detection. Exports from this product ship known headers
 * (`analysis_sentiment`, `created_at`, …), but people also drop files that
 * went through a spreadsheet, another tool, or a different vendor — so each
 * role matches a list of aliases rather than one exact name.
 */

import type { ColumnMapping, SentimentScale } from "./types";

/** Lowercase, strip everything that isn't a letter or digit. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Aliases per role, best first. A header wins a role on an exact normalized
 * match; failing that, on containing the alias as a substring.
 */
const ALIASES: Record<Exclude<keyof ColumnMapping, "emotions">, string[]> = {
  sentiment: [
    "analysissentiment",
    "sentimentscore",
    "sentiment",
    "polarity",
    "compound",
    "sentimentvalue",
    "score",
  ],
  createdAt: ["createdat", "collectedat", "date", "datetime", "timestamp", "time", "publishedat"],
  // `summary` is deliberately absent: in this product's exports it holds
  // platform metadata as JSON, not prose, so it must never become the text a
  // scoring API sees. `translated_content` mirrors `raw_content` when the post
  // is already English, which makes it a safe fallback.
  text: ["rawcontent", "content", "translatedcontent", "text", "body", "message", "post", "title"],
  domain: ["domain", "site", "source", "platform", "website"],
  language: ["language", "lang", "detectedlanguage"],
  classification: ["analysisclassificationlabel", "classificationlabel", "classification", "category", "topic"],
  classificationScore: ["analysisclassificationscore", "classificationscore", "categoryscore"],
  author: ["username", "author", "user", "screenname", "handle", "accountname"],
  url: ["url", "link", "permalink", "posturl"],
  keywords: ["analysistopkeywords", "topkeywords", "keywords", "tags", "entities"],
  id: ["externalid", "id", "postid", "docid", "uuid", "guid"],
};

/** Columns whose name marks them as one of the per-emotion score columns. */
function isEmotionColumn(header: string): boolean {
  const n = normalizeHeader(header);
  return n.startsWith("analysisemotion") || n.startsWith("emotion");
}

/** Human label for an emotion column: `analysis_emotion_joy` → `joy`. */
export function emotionLabel(column: string): string {
  return column.replace(/^analysis_emotion_/i, "").replace(/^emotion_?/i, "").replace(/_/g, " ");
}

/**
 * Assign each role to the best-matching header. A header can only take one
 * role, so `summary` cannot both be the text column and shadow something else.
 */
export function detectMapping(
  headers: string[],
  overrides: Partial<ColumnMapping> = {},
): ColumnMapping {
  const emotions = headers.filter(isEmotionColumn);
  const taken = new Set<string>(emotions);
  const mapping: ColumnMapping = {
    sentiment: null,
    createdAt: null,
    text: null,
    domain: null,
    language: null,
    classification: null,
    classificationScore: null,
    author: null,
    url: null,
    keywords: null,
    id: null,
    emotions,
  };

  // Honour overrides first so a user's choice can never be stolen by detection.
  for (const [role, column] of Object.entries(overrides)) {
    if (role === "emotions" || typeof column !== "string" || !column) continue;
    if (!headers.includes(column)) continue;
    mapping[role as Exclude<keyof ColumnMapping, "emotions">] = column;
    taken.add(column);
  }

  for (const [role, aliases] of Object.entries(ALIASES) as [
    Exclude<keyof ColumnMapping, "emotions">,
    string[],
  ][]) {
    if (mapping[role]) continue;
    const free = headers.filter((h) => !taken.has(h));
    let hit =
      aliases.map((a) => free.find((h) => normalizeHeader(h) === a)).find(Boolean) ?? null;
    if (!hit) {
      hit = aliases.map((a) => free.find((h) => normalizeHeader(h).includes(a))).find(Boolean) ?? null;
    }
    if (hit) {
      mapping[role] = hit;
      taken.add(hit);
    }
  }

  // An explicit `null` override means "this role has no column".
  for (const [role, column] of Object.entries(overrides)) {
    if (role === "emotions") continue;
    if (column === null) mapping[role as Exclude<keyof ColumnMapping, "emotions">] = null;
  }

  return mapping;
}

const POSITIVE_WORDS = new Set(["positive", "pos", "positivo", "good", "bullish", "1", "+1"]);
const NEGATIVE_WORDS = new Set(["negative", "neg", "negativo", "bad", "bearish", "-1"]);
const NEUTRAL_WORDS = new Set(["neutral", "neu", "neutro", "mixed", "0"]);

/**
 * Read one sentiment cell. Returns null when the cell holds nothing usable,
 * which the caller counts as "no sentiment" rather than as a zero.
 */
export function readSentiment(raw: unknown, scale: SentimentScale): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return finite(scale === "unit" ? raw * 2 - 1 : raw);

  const text = String(raw).trim();
  if (!text) return null;

  if (scale === "label") {
    const word = text.toLowerCase();
    if (POSITIVE_WORDS.has(word)) return 1;
    if (NEGATIVE_WORDS.has(word)) return -1;
    if (NEUTRAL_WORDS.has(word)) return 0;
    return null;
  }

  const num = Number(text.replace(",", "."));
  if (Number.isFinite(num)) return finite(scale === "unit" ? num * 2 - 1 : num);

  // A numeric scale that turns out to hold words still reads sensibly.
  const word = text.toLowerCase();
  if (POSITIVE_WORDS.has(word)) return 1;
  if (NEGATIVE_WORDS.has(word)) return -1;
  if (NEUTRAL_WORDS.has(word)) return 0;
  return null;
}

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Parse a numeric cell, tolerating blanks and stray quoting. */
export function readNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const num = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse a timestamp cell into epoch ms. Handles the export's
 * `YYYY-MM-DD HH:MM:SS.mmm` (UTC, no zone marker), ISO strings, and epoch
 * seconds or milliseconds.
 */
export function readTimestamp(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.getTime();

  if (typeof raw === "number") return epochToMs(raw);

  const text = String(raw).trim();
  if (!text) return null;

  if (/^-?\d+(\.\d+)?$/.test(text)) return epochToMs(Number(text));

  // Bare `YYYY-MM-DD HH:MM:SS` is UTC in this product's exports; say so
  // explicitly or the browser would read it as local time.
  const bare = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2}(\.\d+)?)?)$/.exec(text);
  if (bare) {
    const ms = Date.parse(`${bare[1]}T${bare[2]}Z`);
    return Number.isNaN(ms) ? null : ms;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const ms = Date.parse(`${text}T00:00:00Z`);
    return Number.isNaN(ms) ? null : ms;
  }

  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}

function epochToMs(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  // Anything under ~1e11 is seconds; above that it is already milliseconds.
  return value < 1e11 ? value * 1000 : value;
}

/** Keywords arrive as a JSON array, a bracketed string, or comma-separated. */
export function readKeywords(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim()).filter(Boolean).slice(0, 30);

  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((k) => String(k).trim()).filter(Boolean).slice(0, 30);
      }
    } catch {
      // Fall through to the split below — a truncated array still has commas.
    }
  }
  return text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((k) => k.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .slice(0, 30);
}
