/**
 * Server-side ingest: getting at an export without anyone downloading it.
 *
 * Two ways in — a completed export job (the app already knows how to ask the
 * index for a fresh presigned link) and a plain URL. Both end up as an
 * `AnalysisSource`, which is the same thing a dropped file becomes, so the
 * pipeline downstream is identical.
 *
 * Fetching a URL a user supplies is a server-side request forgery risk, so
 * every hop is checked: protocol, host allowlist, and the resolved addresses,
 * with redirects followed by hand rather than by `fetch`.
 */

import { lookup } from "node:dns/promises";
import { getExportJob } from "../api-client";
import type { IngestSpec } from "./ingest-spec";
import { streamSource, type AnalysisSource } from "./source";

const MAX_REDIRECTS = 3;

export class IngestError extends Error {}

/**
 * Self-hosted deployments sometimes keep export storage on the same private
 * network, which the address check would otherwise refuse. Off by default:
 * turning it on means a URL someone types can reach inside your network.
 */
function allowPrivate(): boolean {
  return process.env.ANALYZE_URL_ALLOW_PRIVATE === "true";
}

/** Hosts this deployment will fetch from, when the operator narrowed it. */
function allowedHosts(): string[] {
  return (process.env.ANALYZE_URL_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fe80") || value.startsWith("fc") || value.startsWith("fd")) return true;
  // IPv4-mapped addresses hide a v4 target inside a v6 literal.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

async function assertFetchable(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new IngestError("Only http and https URLs can be ingested.");
  }

  const hosts = allowedHosts();
  const host = url.hostname.toLowerCase();
  if (hosts.length && !hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new IngestError(`This deployment only ingests from: ${hosts.join(", ")}.`);
  }

  if (allowPrivate()) return;

  const addresses = await lookup(host, { all: true }).catch(() => {
    throw new IngestError(`Could not resolve ${host}.`);
  });
  for (const { address, family } of addresses) {
    const isPrivate = family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
    if (isPrivate) {
      throw new IngestError(`${host} resolves to a private address, which is not fetchable.`);
    }
  }
}

/** Fetch with redirects followed by hand, re-checking every hop. */
async function fetchChecked(rawUrl: string, signal?: AbortSignal): Promise<Response> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new IngestError("That is not a valid URL.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertFetchable(url);
    const response = await fetch(url, { redirect: "manual", signal });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new IngestError(`Redirect without a target (${response.status}).`);
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new IngestError(`The source responded ${response.status} ${response.statusText}.`);
    }
    if (!response.body) throw new IngestError("The source returned an empty body.");
    return response;
  }

  throw new IngestError("Too many redirects.");
}

/** A readable name for the source: the download's own, or the URL's last path segment. */
function nameFor(url: URL, response: Response): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (named?.[1]) return decodeURIComponent(named[1]);

  const last = url.pathname.split("/").filter(Boolean).pop();
  if (last && /\.[a-z0-9]{2,6}(\.gz)?$/i.test(last)) return last;

  // No usable name: let the content type name it, so the reader picks a format.
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("json")) return `${last || "export"}.jsonl`;
  if (type.includes("csv")) return `${last || "export"}.csv`;
  if (type.includes("sheet") || type.includes("excel")) return `${last || "export"}.xlsx`;
  return last || "export";
}

async function urlSource(rawUrl: string, signal?: AbortSignal): Promise<AnalysisSource> {
  const response = await fetchChecked(rawUrl, signal);
  const length = Number(response.headers.get("content-length"));
  return streamSource(response.body as ReadableStream<Uint8Array>, {
    name: nameFor(new URL(rawUrl), response),
    size: Number.isFinite(length) && length > 0 ? length : 0,
  });
}

/**
 * Resolve an ingest request to bytes. A job id is turned into a download link
 * through the index's own API, so an expired link is a clear message rather
 * than a mystery 403.
 */
export async function openIngestSource(
  spec: IngestSpec,
  { apiKey, signal }: { apiKey?: string; signal?: AbortSignal } = {},
): Promise<AnalysisSource> {
  if (spec.kind === "url") return urlSource(spec.url, signal);

  const job = await getExportJob(spec.jobId, apiKey);
  const status = job.status?.toLowerCase();
  if (status && status !== "completed") {
    throw new IngestError(`Export ${spec.jobId} is ${job.status}, so there is nothing to read yet.`);
  }
  if (!job.download_url) {
    throw new IngestError(
      "That export has no download link right now. Sync it on the Exports page to mint a fresh one.",
    );
  }
  return urlSource(job.download_url, signal);
}
