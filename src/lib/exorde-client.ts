import { EXORDE_DEFAULT_BASE_URL } from "./constants";
import {
  ExordeApiError,
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

function getBaseUrl() {
  return process.env.EXORDE_API_BASE_URL?.trim() || EXORDE_DEFAULT_BASE_URL;
}

function getApiKey(override?: string) {
  const key = override?.trim() || process.env.EXORDE_API_KEY?.trim();
  if (!key) {
    throw new ExordeApiError(401, {
      detail: "EXORDE_API_KEY is not configured. Add it in Settings or .env.local.",
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

export async function exordeFetch<T>(
  path: string,
  { method = "GET", body, apiKey, requireAuth = true, searchParams }: FetchOptions = {},
): Promise<T> {
  const url = new URL(path, getBaseUrl());
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
    throw new ExordeApiError(response.status, payload, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
  }

  return payload as T;
}

export function getHealth() {
  return exordeFetch<HealthResponse>("/health", { requireAuth: false });
}

export function getQueueCapacity(apiKey?: string) {
  return exordeFetch<QueueCapacityResponse>("/api/v1/queue/capacity", { apiKey });
}

export function getUserInfo(apiKey?: string) {
  return exordeFetch<UserInfoResponse>("/api/v1/user/info", { apiKey });
}

export function getUserQuota(apiKey?: string) {
  return exordeFetch<UserQuotaResponse>("/api/v1/user/quota", { apiKey });
}

export function previewQuery(body: QueryBody, apiKey?: string) {
  return exordeFetch<PreviewResponse>("/api/v1/preview", {
    method: "POST",
    body,
    apiKey,
  });
}

export function createExport(body: QueryBody, apiKey?: string) {
  return exordeFetch<ExportCreateResponse>("/api/v1/export", {
    method: "POST",
    body,
    apiKey,
  });
}

export function getExportJob(jobId: string, apiKey?: string) {
  return exordeFetch<ExportJobResponse>(`/api/v1/export/${encodeURIComponent(jobId)}`, {
    apiKey,
  });
}

export function syncExportJob(jobId: string, apiKey?: string) {
  return exordeFetch<ExportJobResponse>("/api/v1/sync/export-job", {
    method: "POST",
    body: { job_id: jobId },
    apiKey,
  });
}

export function listUserExports(limit = 20, apiKey?: string) {
  return exordeFetch<UserExportsResponse>("/api/v1/user/exports", {
    apiKey,
    searchParams: { limit },
  });
}
