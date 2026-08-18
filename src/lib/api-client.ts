
import {
  UpstreamApiError,
  type ExportCreateResponse,
  type ExportJobResponse,
  type HealthResponse,
  type PreviewResponse,
  type QueryBody,
  type QueueCapacityResponse,
  type UserExportsResponse,
  type UserInfoResponse,
  type UserQuotaResponse,
} from "./types";

/*
 * Upstream host. Declared here rather than in constants.ts because that module
 * is imported by client components, which would ship this string to the browser.
 * Nothing in this file runs client-side.
 */
const DEFAULT_API_BASE_URL = "https://export-api.exorde.io";

export function resolveBaseUrl() {
  // The legacy name is still read so an existing deployment keeps working until
  // the new variable is added.
  return (
    process.env.SENTINEL_API_BASE_URL?.trim() ||
    process.env.EXORDE_API_BASE_URL?.trim() ||
    DEFAULT_API_BASE_URL
  );
}

function getApiKey() {
  // The key is read from the environment only. There is deliberately no path
  // for the browser to supply one: it would put the credential on the client.
  const key = process.env.SENTINEL_API_KEY?.trim() || process.env.EXORDE_API_KEY?.trim();
  if (!key) {
    throw new UpstreamApiError(401, {
      detail:
        "SENTINEL_API_KEY is not configured. Set it in .env.local for local development, " +
        "or with `vercel env add SENTINEL_API_KEY` for a deployment.",
    });
  }
  return key;
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  requireAuth?: boolean;
  searchParams?: Record<string, string | number | undefined>;
};

export async function upstreamFetch<T>(
  path: string,
  { method = "GET", body, requireAuth = true, searchParams }: FetchOptions = {},
): Promise<T> {
  const url = new URL(path, resolveBaseUrl());
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (requireAuth) {
    headers["X-API-Key"] = getApiKey();
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!response.ok) {
    throw new UpstreamApiError(response.status, payload, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
  }

  return payload as T;
}

export function getHealth() {
  return upstreamFetch<HealthResponse>("/health", { requireAuth: false });
}

export function getQueueCapacity() {
  return upstreamFetch<QueueCapacityResponse>("/api/v1/queue/capacity");
}

export function getUserInfo() {
  return upstreamFetch<UserInfoResponse>("/api/v1/user/info");
}

export function getUserQuota() {
  return upstreamFetch<UserQuotaResponse>("/api/v1/user/quota");
}

export function previewQuery(body: QueryBody) {
  return upstreamFetch<PreviewResponse>("/api/v1/preview", {
    method: "POST",
    body,
  });
}

export function createExport(body: QueryBody) {
  return upstreamFetch<ExportCreateResponse>("/api/v1/export", {
    method: "POST",
    body,
  });
}

export function getExportJob(jobId: string) {
  return upstreamFetch<ExportJobResponse>(`/api/v1/export/${encodeURIComponent(jobId)}`);
}

export function syncExportJob(jobId: string) {
  return upstreamFetch<ExportJobResponse>("/api/v1/sync/export-job", {
    method: "POST",
    body: { job_id: jobId },
  });
}

export function listUserExports(limit = 20) {
  return upstreamFetch<UserExportsResponse>("/api/v1/user/exports", {
    searchParams: { limit },
  });
}
