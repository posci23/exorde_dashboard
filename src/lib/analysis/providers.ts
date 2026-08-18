/**
 * Scoring providers — the "analyze via an API of my choice" seam.
 *
 * The API isn't chosen yet, so nothing here hard-codes one. A provider is
 * described entirely by environment variables: where to POST, how to
 * authenticate, what the request body looks like, where the score sits in the
 * response, and what scale that score is on. Picking a vendor later is a
 * matter of filling those in — and if a response shape is genuinely exotic,
 * `buildProvider` is the one function to fork.
 *
 * Credentials stay in this module. Like `api-client.ts`, nothing here runs
 * client-side — the browser reaches scoring through `/api/analysis/score`,
 * never the vendor directly.
 */

import type { Scorer } from "./scoring";

export type ProviderScale =
  /** Score already runs -1 … 1. */
  | "signed"
  /** Score runs 0 … 1 (positivity); rescaled to 2v-1. */
  | "unit"
  /** Response carries a word: positive / negative / neutral. */
  | "label"
  /** Response carries a word *and* a confidence; sign × confidence is used. */
  | "label_score";

export type ProviderConfig = {
  id: string;
  label: string;
  url: string;
  apiKey?: string;
  authHeader: string;
  authPrefix: string;
  /** "batch" posts an array of texts; "single" posts one text per request. */
  mode: "batch" | "single";
  inputField: string;
  extraBody: Record<string, unknown>;
  scorePath: string;
  labelPath?: string;
  scale: ProviderScale;
  labelMap: Record<string, number>;
  batchSize: number;
  concurrency: number;
  timeoutMs: number;
};

export type ProviderSummary = {
  id: string;
  label: string;
  /** Whether the deployment actually has this one wired up. */
  configured: boolean;
  description: string;
};

const DEFAULT_LABEL_MAP: Record<string, number> = {
  positive: 1,
  pos: 1,
  label_2: 1,
  negative: -1,
  neg: -1,
  label_0: -1,
  neutral: 0,
  neu: 0,
  label_1: 0,
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

function envInt(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function parseLabelMap(raw: string | undefined): Record<string, number> {
  if (!raw) return DEFAULT_LABEL_MAP;
  const map: Record<string, number> = { ...DEFAULT_LABEL_MAP };
  for (const pair of raw.split(",")) {
    const [key, value] = pair.split(":");
    const score = Number(value);
    if (key?.trim() && Number.isFinite(score)) map[key.trim().toLowerCase()] = score;
  }
  return map;
}

function parseExtraBody(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** The configuration this deployment carries, or null when unset. */
export function readConfig(): ProviderConfig | null {
  const url = env("SENTIMENT_API_URL");
  if (!url) return null;

  const mode = env("SENTIMENT_API_MODE") === "single" ? "single" : "batch";
  const scale = (env("SENTIMENT_API_SCALE") ?? "signed") as ProviderScale;

  return {
    id: env("SENTIMENT_API_ID") ?? "api",
    label: env("SENTIMENT_API_LABEL") ?? "Scoring API",
    url,
    apiKey: env("SENTIMENT_API_KEY"),
    authHeader: env("SENTIMENT_API_AUTH_HEADER") ?? "Authorization",
    authPrefix: env("SENTIMENT_API_AUTH_PREFIX") ?? "Bearer",
    mode,
    inputField: env("SENTIMENT_API_INPUT_FIELD") ?? (mode === "single" ? "text" : "texts"),
    extraBody: parseExtraBody(env("SENTIMENT_API_EXTRA_BODY")),
    scorePath: env("SENTIMENT_API_SCORE_PATH") ?? (mode === "single" ? "score" : "scores[]"),
    labelPath: env("SENTIMENT_API_LABEL_PATH"),
    scale: ["signed", "unit", "label", "label_score"].includes(scale) ? scale : "signed",
    labelMap: parseLabelMap(env("SENTIMENT_API_LABEL_MAP")),
    batchSize: envInt("SENTIMENT_API_BATCH_SIZE", 32),
    concurrency: envInt("SENTIMENT_API_CONCURRENCY", 2),
    timeoutMs: envInt("SENTIMENT_API_TIMEOUT_MS", 20_000),
  };
}

/** What the UI is allowed to know: names and whether they work. */
export function listProviders(): ProviderSummary[] {
  const config = readConfig();
  return [
    {
      id: "column",
      label: "Sentiment column in the data",
      configured: true,
      description: "Use the score the export already carries. Nothing is sent anywhere.",
    },
    {
      id: config?.id ?? "api",
      label: config?.label ?? "Scoring API",
      configured: Boolean(config),
      description: config
        ? `Post the text column to ${safeHost(config.url)} and read the score back.`
        : "Not configured on this deployment. Set SENTIMENT_API_URL to enable it.",
    },
  ];
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "the configured endpoint";
  }
}

/**
 * Walk a response with a dotted path. `[]` steps into an array and keeps
 * every element, so `results[].score` reads one score per input and
 * `scores[]` reads a bare array.
 */
export function resolvePath(root: unknown, path: string): unknown[] {
  let current: unknown[] = [root];
  for (const rawStep of path.split(".")) {
    const step = rawStep.trim();
    if (!step) continue;
    const iterate = step.endsWith("[]");
    const key = iterate ? step.slice(0, -2) : step;

    const next: unknown[] = [];
    for (const value of current) {
      const picked = key ? pick(value, key) : value;
      if (iterate && Array.isArray(picked)) next.push(...picked);
      else if (picked !== undefined) next.push(picked);
    }
    current = next;
  }
  return current;
}

function pick(value: unknown, key: string): unknown {
  if (value == null || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

/** Turn one response value (and optional label) into a -1 … 1 score. */
export function normalizeScore(
  config: ProviderConfig,
  score: unknown,
  label: unknown,
): number | null {
  const numeric = typeof score === "number" ? score : Number(score);

  switch (config.scale) {
    case "unit":
      return Number.isFinite(numeric) ? clamp(numeric * 2 - 1) : null;
    case "label":
      return labelValue(config, score ?? label);
    case "label_score": {
      const sign = labelValue(config, label ?? score);
      if (sign == null) return null;
      const magnitude = Number.isFinite(numeric) ? Math.abs(numeric) : 1;
      return clamp(sign * magnitude);
    }
    default:
      return Number.isFinite(numeric) ? clamp(numeric) : labelValue(config, score);
  }
}

function labelValue(config: ProviderConfig, value: unknown): number | null {
  if (typeof value !== "string") return null;
  const mapped = config.labelMap[value.trim().toLowerCase()];
  return typeof mapped === "number" ? clamp(mapped) : null;
}

function clamp(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value;
}

/**
 * Build the scorer for a configured provider. Requests carry a timeout of
 * their own so one hung call can't hold an ingest open.
 */
export function buildProvider(config: ProviderConfig): Scorer {
  async function post(body: unknown, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(config.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (config.apiKey) {
      headers[config.authHeader] = config.authPrefix
        ? `${config.authPrefix} ${config.apiKey}`
        : config.apiKey;
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: combined,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Scoring API responded ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response.json();
  }

  function readOne(payload: unknown): number | null {
    const scores = resolvePath(payload, config.scorePath);
    const labels = config.labelPath ? resolvePath(payload, config.labelPath) : [];
    return normalizeScore(config, scores[0], labels[0]);
  }

  return {
    id: config.id,
    label: config.label,
    batchSize: config.mode === "single" ? 1 : config.batchSize,
    concurrency: config.concurrency,
    async score(texts, signal) {
      if (config.mode === "single") {
        const payload = await post({ ...config.extraBody, [config.inputField]: texts[0] }, signal);
        return [readOne(payload)];
      }

      const payload = await post({ ...config.extraBody, [config.inputField]: texts }, signal);
      const scores = resolvePath(payload, config.scorePath);
      const labels = config.labelPath ? resolvePath(payload, config.labelPath) : [];

      // A provider that answers out of order, or short, is a provider whose
      // scores can't be trusted to line up — say so rather than guess.
      if (scores.length !== texts.length && scores.length !== 0) {
        if (scores.length < texts.length) {
          throw new Error(
            `Scoring API returned ${scores.length} scores for ${texts.length} texts.`,
          );
        }
      }
      return texts.map((_, index) => normalizeScore(config, scores[index], labels[index]));
    },
  };
}

/** The scorer for an id, or null when this deployment has none. */
export function getProvider(id: string | null): Scorer | null {
  const config = readConfig();
  if (!config) return null;
  if (id && id !== config.id && id !== "api") return null;
  return buildProvider(config);
}
