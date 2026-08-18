import { getProvider, readConfig } from "@/lib/analysis/providers";
import { jsonError, jsonOk } from "@/lib/api-helpers";

/** Client mistakes are 400s; a deployment with no provider is a 501. */
function fail(detail: string, status: number) {
  return Response.json({ ok: false, status, error: { detail } }, { status });
}

export const runtime = "nodejs";
export const maxDuration = 60;

/** Texts per request. Beyond this, the caller should send more requests. */
const MAX_TEXTS = 256;
const MAX_CHARS = 4_000;

/**
 * Scoring on behalf of the browser.
 *
 * A file dropped in the page is never uploaded, but scoring it through a
 * remote API does mean its *text* is sent — that is what scoring is. This
 * route is the only way that text leaves the browser, and it exists so the
 * provider's credentials can stay on the server.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { provider, texts } = (body ?? {}) as { provider?: string | null; texts?: unknown };

    if (!Array.isArray(texts) || texts.length === 0) {
      return fail("Send a non-empty `texts` array.", 400);
    }
    if (texts.length > MAX_TEXTS) {
      return fail(`At most ${MAX_TEXTS} texts per request.`, 400);
    }
    if (!readConfig()) {
      return fail("No scoring API is configured on this deployment (set SENTIMENT_API_URL).", 501);
    }

    const scorer = getProvider(provider ?? null);
    if (!scorer) return fail(`Unknown scoring provider: ${provider}`, 400);

    const trimmed = texts.map((text) => String(text ?? "").slice(0, MAX_CHARS));
    const scores = await scorer.score(trimmed, request.signal);
    return jsonOk({ provider: scorer.id, scores });
  } catch (error) {
    return jsonError(error);
  }
}
