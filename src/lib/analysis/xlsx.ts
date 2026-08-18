/**
 * A minimal streaming .xlsx reader — no dependency, no full-file buffering.
 *
 * An .xlsx is a zip of XML parts. The browser can already inflate deflate
 * streams (`DecompressionStream`), so the work here is: find the sheet inside
 * the zip's central directory, hand its compressed byte range to the platform,
 * and scan the resulting XML for `<row>` / `<c>` elements as it arrives.
 * Shared strings are the one part held in memory, because cells reference them
 * by index.
 */

import { byteStream, textOf } from "./stream";

const EOCD_SIG = 0x06054b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const CD_SIG = 0x02014b50;

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

async function sliceBytes(file: Blob, start: number, end: number): Promise<DataView> {
  const buffer = await file.slice(start, end).arrayBuffer();
  return new DataView(buffer);
}

/** Read the zip's central directory: every part, its offset and its size. */
async function readDirectory(file: Blob): Promise<Map<string, ZipEntry>> {
  const tailSize = Math.min(file.size, 66_000);
  const tail = await sliceBytes(file, file.size - tailSize, file.size);

  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx file (no zip directory found).");

  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);

  // ZIP64: the 32-bit fields saturate and the real values live in a separate
  // record that the locator right before the EOCD points at.
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const locator = eocd - 20;
    if (locator < 0) throw new Error("Unsupported zip layout in this .xlsx file.");
    const z64Offset = Number(tail.getBigUint64(locator + 8, true));
    const z64 = await sliceBytes(file, z64Offset, z64Offset + 56);
    if (z64.getUint32(0, true) !== ZIP64_EOCD_SIG) {
      throw new Error("Unsupported zip layout in this .xlsx file.");
    }
    cdSize = Number(z64.getBigUint64(40, true));
    cdOffset = Number(z64.getBigUint64(48, true));
  }

  const cd = await sliceBytes(file, cdOffset, cdOffset + cdSize);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();

  let p = 0;
  while (p + 46 <= cd.byteLength && cd.getUint32(p, true) === CD_SIG) {
    const method = cd.getUint16(p + 10, true);
    let compressedSize = cd.getUint32(p + 20, true);
    const nameLength = cd.getUint16(p + 28, true);
    const extraLength = cd.getUint16(p + 30, true);
    const commentLength = cd.getUint16(p + 32, true);
    let localHeaderOffset = cd.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLength));

    if (compressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      const extraStart = p + 46 + nameLength;
      let e = extraStart;
      while (e + 4 <= extraStart + extraLength) {
        const headerId = cd.getUint16(e, true);
        const size = cd.getUint16(e + 2, true);
        if (headerId === 0x0001) {
          // Uncompressed size comes first, then compressed, then the offset —
          // each present only if its 32-bit field was saturated.
          let q = e + 4;
          if (cd.getUint32(p + 24, true) === 0xffffffff) q += 8;
          if (compressedSize === 0xffffffff) {
            compressedSize = Number(cd.getBigUint64(q, true));
            q += 8;
          }
          if (localHeaderOffset === 0xffffffff) localHeaderOffset = Number(cd.getBigUint64(q, true));
          break;
        }
        e += 4 + size;
      }
    }

    entries.set(name, { name, method, compressedSize, localHeaderOffset });
    p += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/**
 * A byte stream for one zip member, inflated if it was deflated.
 *
 * Typed as `BufferSource` because that is what `DecompressionStream` and
 * `TextDecoderStream` accept on their writable end.
 */
async function openEntry(file: Blob, entry: ZipEntry): Promise<ReadableStream<BufferSource>> {
  const header = await sliceBytes(file, entry.localHeaderOffset, entry.localHeaderOffset + 30);
  const nameLength = header.getUint16(26, true);
  const extraLength = header.getUint16(28, true);
  const start = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const raw = byteStream(file.slice(start, start + entry.compressedSize));
  if (entry.method === 0) return raw;
  if (entry.method !== 8) throw new Error(`Unsupported compression in .xlsx (method ${entry.method}).`);
  return raw.pipeThrough(new DecompressionStream("deflate-raw"));
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return ENTITIES[body] ?? match;
  });
}

/**
 * Writers differ on namespaces — Excel emits `<row>`, others emit `<x:row>` —
 * so every tag pattern here tolerates an optional prefix.
 */
const SI_OPEN = /<(?:[A-Za-z0-9]+:)?si\b[^>]*?(\/?)>/g;
const SI_CLOSE = /<\/(?:[A-Za-z0-9]+:)?si>/g;
const ROW_OPEN = /<(?:[A-Za-z0-9]+:)?row\b[^>]*?(\/?)>/g;
const ROW_CLOSE = /<\/(?:[A-Za-z0-9]+:)?row>/g;

/** Shared strings, in index order. Cells reference these by number. */
async function readSharedStrings(stream: ReadableStream<BufferSource>): Promise<string[]> {
  const strings: string[] = [];
  let buffer = "";
  for await (const chunk of textOf(stream)) {
    buffer += chunk;
    let cut = 0;
    for (;;) {
      SI_OPEN.lastIndex = cut;
      const open = SI_OPEN.exec(buffer);
      if (!open) break;
      if (open[1] === "/") {
        strings.push("");
        cut = SI_OPEN.lastIndex;
        continue;
      }
      SI_CLOSE.lastIndex = SI_OPEN.lastIndex;
      const close = SI_CLOSE.exec(buffer);
      if (!close) break;
      strings.push(collectText(buffer.slice(open.index, close.index)));
      cut = SI_CLOSE.lastIndex;
    }
    // Keep only the unfinished tail, so memory tracks the largest single entry.
    if (cut > 0) buffer = buffer.slice(cut);
  }
  return strings;
}

/** Concatenate every `<t>` run inside a fragment. */
function collectText(fragment: string): string {
  let out = "";
  const re = /<(?:[A-Za-z0-9]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z0-9]+:)?t>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(fragment))) out += decodeXml(match[1] ?? "");
  return out;
}

/** `A` → 0, `Z` → 25, `AA` → 26. */
function columnIndex(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const code = ref.charCodeAt(i);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

const CELL_RE = /<(?:[A-Za-z0-9]+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[A-Za-z0-9]+:)?c>)/g;
const V_RE = /<(?:[A-Za-z0-9]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z0-9]+:)?v>/;
const REF_RE = /\br="([A-Z]+)\d+"/;
const TYPE_RE = /\bt="([^"]+)"/;

function parseRow(fragment: string, shared: string[]): string[] {
  const cells: string[] = [];
  CELL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let next = 0;
  while ((match = CELL_RE.exec(fragment))) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const ref = REF_RE.exec(attrs);
    const index = ref ? columnIndex(ref[1]) : next;
    next = index + 1;

    const type = TYPE_RE.exec(attrs)?.[1] ?? "n";
    let value = "";
    if (type === "inlineStr") {
      value = collectText(body);
    } else {
      const v = V_RE.exec(body);
      const raw = v ? decodeXml(v[1]) : "";
      if (type === "s") {
        value = shared[Number(raw)] ?? "";
      } else if (type === "b") {
        value = raw === "1" ? "TRUE" : "FALSE";
      } else {
        value = raw;
      }
    }

    while (cells.length < index) cells.push("");
    cells[index] = value;
  }
  return cells;
}

/**
 * Stream the first worksheet's rows. `onRow` receives raw cell strings in
 * column order; blank cells come through as empty strings so a row's shape
 * always matches the header row.
 */
export async function readXlsxRows(
  file: Blob,
  onRow: (cells: string[]) => void,
  onProgress?: (bytesRead: number) => void,
  /** Runs at each chunk boundary; returning true stops the read. */
  afterChunk?: () => Promise<boolean>,
): Promise<void> {
  const entries = await readDirectory(file);

  const sheetName =
    [...entries.keys()]
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .sort()[0] ?? null;
  if (!sheetName) throw new Error("No worksheet found inside the .xlsx file.");

  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const shared = sharedEntry ? await readSharedStrings(await openEntry(file, sharedEntry)) : [];

  const sheet = entries.get(sheetName)!;
  let buffer = "";
  let bytes = 0;
  for await (const chunk of textOf(await openEntry(file, sheet))) {
    buffer += chunk;
    bytes += chunk.length;
    onProgress?.(bytes);

    let cut = 0;
    for (;;) {
      ROW_OPEN.lastIndex = cut;
      const open = ROW_OPEN.exec(buffer);
      if (!open) break;
      // `<row/>` is a row of blanks: nothing to read, but it still ends here.
      if (open[1] === "/") {
        cut = ROW_OPEN.lastIndex;
        continue;
      }
      ROW_CLOSE.lastIndex = ROW_OPEN.lastIndex;
      const close = ROW_CLOSE.exec(buffer);
      if (!close) break;
      onRow(parseRow(buffer.slice(open.index, close.index), shared));
      cut = ROW_CLOSE.lastIndex;
    }
    if (cut > 0) buffer = buffer.slice(cut);
    if (afterChunk && (await afterChunk())) return;
  }
}
