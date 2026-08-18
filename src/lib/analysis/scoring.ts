/**
 * Scoring: where a sentiment value comes from when the data has none.
 *
 * Two paths, one interface. Server-side ingest calls a configured provider in
 * process; a file dropped in the browser calls the same provider through this
 * app's `/api/analysis/score` route, so the provider's key never reaches the
 * page. Either way the pipeline sees a `Scorer` and nothing else.
 */

export type Scorer = {
  id: string;
  label: string;
  /** Texts per request. */
  batchSize: number;
  /** Requests in flight at once. */
  concurrency: number;
  /** One score per input, in order. `null` where the provider had no answer. */
  score: (texts: string[], signal?: AbortSignal) => Promise<(number | null)[]>;
};

export type ScoringMode =
  /** Read the sentiment column already in the data. */
  | "column"
  /** Send the text column to the configured scoring API. */
  | "api";

export type ScoringOptions = {
  mode: ScoringMode;
  /** Which configured provider to call; null means the server default. */
  providerId: string | null;
  /**
   * Hard ceiling on rows sent to the API. Scoring is billed per call, so the
   * default stops well short of "the whole file" and the report says how many
   * rows went unscored.
   */
  maxRows: number;
};

export const DEFAULT_SCORING: ScoringOptions = {
  mode: "column",
  providerId: null,
  maxRows: 5_000,
};

/**
 * Run batches through a scorer with bounded concurrency, preserving order.
 * A failed batch yields nulls rather than sinking the whole analysis — one bad
 * request should cost its own rows, not the file.
 */
export async function scoreAll(
  scorer: Scorer,
  texts: string[],
  signal?: AbortSignal,
  onError?: (error: unknown) => void,
): Promise<(number | null)[]> {
  const results = new Array<number | null>(texts.length).fill(null);
  const batches: Array<{ start: number; texts: string[] }> = [];
  for (let i = 0; i < texts.length; i += scorer.batchSize) {
    batches.push({ start: i, texts: texts.slice(i, i + scorer.batchSize) });
  }

  let next = 0;
  const workers = Array.from({ length: Math.max(1, scorer.concurrency) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= batches.length) return;
      const batch = batches[index];
      try {
        const scores = await scorer.score(batch.texts, signal);
        for (let i = 0; i < batch.texts.length; i++) {
          const value = scores[i];
          results[batch.start + i] = typeof value === "number" && Number.isFinite(value) ? value : null;
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        // Leave this batch as nulls; the cleaning report counts them, and the
        // caller decides whether losing every batch is worth an error.
        onError?.(error);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * A scorer that goes through this app's own route. Used from the browser and
 * from the worker, where the provider's credentials are deliberately absent.
 */
export function routeScorer({
  providerId,
  label,
  batchSize = 32,
  concurrency = 2,
  endpoint = "/api/analysis/score",
}: {
  providerId: string | null;
  label: string;
  batchSize?: number;
  concurrency?: number;
  endpoint?: string;
}): Scorer {
  return {
    id: providerId ?? "default",
    label,
    batchSize,
    concurrency,
    async score(texts, signal) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, texts }),
        signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Scoring failed (${response.status}) ${detail.slice(0, 200)}`);
      }
      const body: unknown = await response.json();
      // The app's routes answer `{ ok, data }`; accept a bare body too, so a
      // caller can point this at another endpoint without a wrapper.
      const payload = (body as { data?: { scores?: unknown }; scores?: unknown }) ?? {};
      const scores = payload.data?.scores ?? payload.scores;
      if (!Array.isArray(scores)) throw new Error("Scoring response had no scores array.");
      return scores.map((value) => (typeof value === "number" ? value : null));
    },
  };
}
