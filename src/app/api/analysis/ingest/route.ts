import { z } from "zod";
import { getProvider } from "@/lib/analysis/providers";
import { IngestError, openIngestSource } from "@/lib/analysis/ingest";
import { analyzeSource } from "@/lib/analysis/run";
import { DEFAULT_SCORING } from "@/lib/analysis/scoring";
import { DEFAULT_CLEAN_OPTIONS, type CleanOptions } from "@/lib/analysis/types";
import { packAggregate } from "@/lib/analysis/wire";
import { getRequestApiKey } from "@/lib/api-helpers";

export const runtime = "nodejs";
/** Long enough for a sizeable export; the platform may cap it lower. */
export const maxDuration = 300;

const mappingSchema = z
  .object({
    sentiment: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    classificationScore: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
  })
  .default({});

const optionsSchema = z
  .object({
    dedupe: z.boolean().default(true),
    minClassificationScore: z.number().min(0).max(1).default(0),
    languages: z.array(z.string()).max(200).default([]),
    domains: z.array(z.string()).max(200).default([]),
    from: z.string().default(""),
    to: z.string().default(""),
    scale: z.enum(["signed", "unit", "label"]).default("signed"),
    mapping: mappingSchema,
  })
  .default(DEFAULT_CLEAN_OPTIONS);

const requestSchema = z.object({
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("job"), jobId: z.string().min(1).max(200) }),
    z.object({ kind: z.literal("url"), url: z.string().min(1).max(4_000) }),
  ]),
  options: optionsSchema,
  scoring: z
    .object({
      mode: z.enum(["column", "api"]).default("column"),
      providerId: z.string().nullable().default(null),
      maxRows: z.number().int().min(1).max(200_000).default(DEFAULT_SCORING.maxRows),
    })
    .default(DEFAULT_SCORING),
});

/**
 * Ingest an export straight from the index — or from any URL — and stream the
 * analysis back as it runs.
 *
 * The reply is NDJSON rather than one JSON body because a large export takes
 * minutes: progress lines arrive while the pass is still going, and the final
 * line carries the aggregate. That keeps the client's experience identical to
 * the in-browser worker, which reports the same way.
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { ok: false, status: 400, error: { detail: parsed.error.issues[0]?.message ?? "Bad request" } },
      { status: 400 },
    );
  }

  const { source: spec, options, scoring } = parsed.data;
  const apiKey = await getRequestApiKey(request);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (message: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      };

      try {
        const source = await openIngestSource(spec, { apiKey, signal: request.signal });
        send({ type: "opened", name: source.name, size: source.size });

        const aggregate = await analyzeSource(source, options as CleanOptions, {
          signal: request.signal,
          scoring,
          makeScorer: (config) => getProvider(config.providerId),
          onProgress: (bytes, rowsRead) => {
            send({ type: "progress", bytes, bytesTotal: source.size, rowsRead });
          },
        });

        send({ type: "done", aggregate: packAggregate(aggregate) });
      } catch (error) {
        const message =
          error instanceof IngestError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Ingest failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Proxies that buffer would defeat the point of streaming progress.
      "X-Accel-Buffering": "no",
    },
  });
}
