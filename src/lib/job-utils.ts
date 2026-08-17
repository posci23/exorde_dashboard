import type { ExportJobResponse } from "./types";

export type DownloadLinkState = "ready" | "expired" | "processing" | "unavailable" | "failed";

export function shortJobId(jobId: string): string {
  const trimmed = jobId.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}

export function isDownloadExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  return Number.isFinite(ts) && ts <= now;
}

export function isDownloadExpiringSoon(
  expiresAt: string | null | undefined,
  withinHours = 6,
  now = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts) || ts <= now) return false;
  return ts - now <= withinHours * 60 * 60 * 1000;
}

export function getDownloadLinkState(row: ExportJobResponse, now = Date.now()): DownloadLinkState {
  const status = row.status.toLowerCase();
  if (status === "failed" || status === "rejected") return "failed";
  if (status !== "completed") return "processing";

  if (row.download_url) {
    return isDownloadExpired(row.download_expires_at, now) ? "expired" : "ready";
  }
  return "unavailable";
}

export function exportRowLabel(row: ExportJobResponse): string {
  const rows = row.rows_returned ?? row.rows;
  if (rows != null) return rows.toLocaleString();
  return shortJobId(row.job_id);
}
