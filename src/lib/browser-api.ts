export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  status?: number;
  error?: unknown;
  retry_after_seconds?: number;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload;
}

export function formatError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
      if (typeof d.error === "string") {
        return `${d.error}${d.reason ? `: ${d.reason}` : ""}${
          d.retry_after_seconds != null ? ` (retry in ${d.retry_after_seconds}s)` : ""
        }${d.existing_job_id ? ` — existing job ${d.existing_job_id}` : ""}`;
      }
      return JSON.stringify(detail);
    }
    return JSON.stringify(error);
  }
  return String(error);
}

export function getDuplicateJobId(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const detail = (error as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object") return null;
  const id = (detail as { existing_job_id?: unknown }).existing_job_id;
  return typeof id === "string" ? id : null;
}
