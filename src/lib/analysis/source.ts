/**
 * Where bytes come from.
 *
 * The analyzer started life reading a file the user dropped, which is a Blob:
 * random access, known length. Server-side ingest has neither — an export
 * arriving over HTTP is a one-shot stream whose length is a header at best. A
 * source hides that difference so `readRows` works either way, and the few
 * places that genuinely need random access (the XLSX reader) ask for `blob`
 * and fall back to buffering when it isn't there.
 */

import { byteStream } from "./stream";

export type AnalysisSource = {
  /** File name or URL basename — the readers pick the format off this. */
  name: string;
  /** Bytes, or 0 when the length is unknown (a chunked response). */
  size: number;
  /** The whole source, once. `onBytes` reports progress in stored bytes. */
  open: (onBytes?: (bytesRead: number) => void) => Promise<ReadableStream<BufferSource>>;
  /** Present only when the source supports random access. */
  blob?: Blob;
};

export function blobSource(blob: Blob, name: string): AnalysisSource {
  return {
    name,
    size: blob.size,
    blob,
    open: async (onBytes) => byteStream(blob, onBytes),
  };
}

export function fileSource(file: File): AnalysisSource {
  return blobSource(file, file.name);
}

/**
 * A source over a response body. Counting happens in a transform because
 * nothing else knows how much has arrived.
 */
export function streamSource(
  stream: ReadableStream<Uint8Array>,
  { name, size }: { name: string; size: number },
): AnalysisSource {
  return {
    name,
    size,
    open: async (onBytes) => {
      if (!onBytes) return stream as unknown as ReadableStream<BufferSource>;
      let bytes = 0;
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          onBytes(bytes);
          controller.enqueue(chunk);
        },
      });
      return stream.pipeThrough(counter) as unknown as ReadableStream<BufferSource>;
    },
  };
}

/**
 * Read the first bytes of a stream without losing them: the peeked chunks are
 * replayed ahead of the rest. Used to spot gzip magic bytes on a source whose
 * name doesn't say.
 */
export async function peek(
  stream: ReadableStream<BufferSource>,
  bytes: number,
): Promise<{ head: Uint8Array; stream: ReadableStream<BufferSource> }> {
  const reader = stream.getReader();
  // Replayed verbatim, so the chunks keep whatever view type they arrived as.
  const chunks: BufferSource[] = [];
  let size = 0;
  let ended = false;

  while (size < bytes) {
    const { done, value } = await reader.read();
    if (done) {
      ended = true;
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  reader.releaseLock();

  const head = new Uint8Array(Math.min(size, bytes));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= head.length) break;
    const view = toBytes(chunk);
    head.set(view.subarray(0, head.length - offset), offset);
    offset += view.byteLength;
  }

  let index = 0;
  let rest: ReadableStreamDefaultReader<BufferSource> | null = null;
  const replayed = new ReadableStream<BufferSource>({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
        return;
      }
      if (ended) {
        controller.close();
        return;
      }
      rest ??= stream.getReader();
      const { done, value } = await rest.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) {
      return rest ? rest.cancel(reason) : stream.cancel(reason);
    },
  });

  return { head, stream: replayed };
}

function toBytes(value: BufferSource): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(value);
}

/** Collect a stream into a Blob — the last resort for formats needing seeks. */
export async function bufferToBlob(
  source: AnalysisSource,
  maxBytes: number,
): Promise<Blob> {
  if (source.blob) return source.blob;
  if (source.size > maxBytes) {
    throw new Error(
      `This format has to be read whole, and the file is larger than the ${Math.round(
        maxBytes / 1_048_576,
      )} MB server limit. Export it as CSV or JSONL, or analyze it in the browser instead.`,
    );
  }

  const reader = (await source.open()).getReader();
  const chunks: BufferSource[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(
          `This format has to be read whole, and the stream passed the ${Math.round(
            maxBytes / 1_048_576,
          )} MB server limit.`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks as BlobPart[]);
}
