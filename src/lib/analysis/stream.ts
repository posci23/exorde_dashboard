/**
 * Bounded byte streams over a Blob.
 *
 * `Blob.stream()` decides its own chunk size, and some runtimes hand back the
 * entire file in one piece — fine for a small export, fatal for a multi-GB
 * one. Slicing explicitly keeps memory flat regardless of runtime, and makes
 * progress exact rather than approximate.
 */

const CHUNK_BYTES = 4 * 1024 * 1024;

export function byteStream(
  blob: Blob,
  onBytes?: (bytesRead: number) => void,
  chunkBytes = CHUNK_BYTES,
): ReadableStream<BufferSource> {
  let offset = 0;
  return new ReadableStream<BufferSource>({
    async pull(controller) {
      if (offset >= blob.size) {
        controller.close();
        return;
      }
      const end = Math.min(offset + chunkBytes, blob.size);
      const chunk = new Uint8Array(await blob.slice(offset, end).arrayBuffer());
      offset = end;
      onBytes?.(offset);
      controller.enqueue(chunk);
    },
  });
}

/** Decoded text from a byte stream, chunk by chunk. */
export async function* textOf(stream: ReadableStream<BufferSource>): AsyncGenerator<string> {
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
