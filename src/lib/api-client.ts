
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

function getApiKey(override?: string) {
  const key =
    override?.trim() ||
    process.env.SENTINEL_API_KEY?.trim() ||
    process.env.EXORDE_API_KEY?.trim();
  if (!key) {
    throw new UpstreamApiError(401, {
      detail: "SENTINEL_API_KEY is not configured. Add it in Settings or .env.local.",
    });
  }
  return key;
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  apiKey?: string;
  requireAuth?: boolean;
  searchParams?: Record<string, string | number | undefined>;
};

export async function upstreamFetch<T>(
  path: string,
  { method = "GET", body, apiKey, requireAuth = true, searchParams }: FetchOptions = {},
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
    headers["X-API-Key"] = getApiKey(apiKey);
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

export function getQueueCapacity(apiKey?: string) {
  return upstreamFetch<QueueCapacityResponse>("/api/v1/queue/capacity", { apiKey });
}

export function getUserInfo(apiKey?: string) {
  return upstreamFetch<UserInfoResponse>("/api/v1/user/info", { apiKey });
}

export function getUserQuota(apiKey?: string) {
  return upstreamFetch<UserQuotaResponse>("/api/v1/user/quota", { apiKey });
}

export function previewQuery(body: QueryBody, apiKey?: string) {
  return upstreamFetch<PreviewResponse>("/api/v1/preview", {
    method: "POST",
    body,
    apiKey,
  });
}

export function createExport(body: QueryBody, apiKey?: string) {
  return upstreamFetch<ExportCreateResponse>("/api/v1/export", {
    method: "POST",
    body,
    apiKey,
  });
}

export function getExportJob(jobId: string, apiKey?: string) {
  return upstreamFetch<ExportJobResponse>(`/api/v1/export/${encodeURIComponent(jobId)}`, {
    apiKey,
  });
}

export function syncExportJob(jobId: string, apiKey?: string) {
  return upstreamFetch<ExportJobResponse>("/api/v1/sync/export-job", {
    method: "POST",
    body: { job_id: jobId },
    apiKey,
  });
}

export function listUserExports(limit = 20, apiKey?: string) {
  return upstreamFetch<UserExportsResponse>("/api/v1/user/exports", {
    apiKey,
    searchParams: { limit },
  });
}
