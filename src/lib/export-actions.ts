import { apiFetch, formatError, getDuplicateJobId } from "./browser-api";
import {
  queryBodySchema,
  type ExportCreateResponse,
  type QueryBody,
  type QueueCapacityResponse,
} from "./types";

export type SubmitResult =
  | { kind: "created"; jobId: string; message: string }
  /** 409 within the 5-minute idempotency window — poll the existing job instead. */
  | { kind: "duplicate"; jobId: string; message: string }
  | { kind: "error"; message: string };

/** Client-side validation shared by preview and export. */
export function validateQuery(body: QueryBody) {
  return queryBodySchema.safeParse(body);
}

export function describeIssues(result: ReturnType<typeof validateQuery>): string[] {
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

/**
 * Submit an export, pre-checking queue capacity and translating the API's
 * 409 / 429 / 503 responses into something actionable.
 */
export async function submitExport(body: QueryBody): Promise<SubmitResult> {
  const capacity = await apiFetch<QueueCapacityResponse>("/api/sentinel/queue-capacity");
  if (capacity.ok && capacity.data && !capacity.data.accepting_new_jobs) {
    return {
      kind: "error",
      message: `Queue is full (${capacity.data.current_jobs}/${capacity.data.max_capacity} slots). Wait for a slot and retry.`,
    };
  }

  const res = await apiFetch<ExportCreateResponse>("/api/sentinel/export", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    const existing = getDuplicateJobId(res.error);
    if (existing) {
      return {
        kind: "duplicate",
        jobId: existing,
        message: `Identical export submitted in the last 5 minutes — tracking the existing job instead.`,
      };
    }
  }

  if (res.status === 429) {
    const wait = res.retry_after_seconds ?? 60;
    return { kind: "error", message: `Rate limited — retry in ${wait}s. ${formatError(res.error)}` };
  }

  if (res.status === 503) {
    return {
      kind: "error",
      message: `Queue saturated. ${formatError(res.error)} Back off and check capacity on Overview.`,
    };
  }

  if (!res.ok || !res.data) {
    return { kind: "error", message: formatError(res.error) };
  }

  return { kind: "created", jobId: res.data.job_id, message: res.data.message };
}
