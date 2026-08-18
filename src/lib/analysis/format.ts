/** Number and date formatting used across the analyzer's panels. */

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(part: number, whole: number, digits = 1): string {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export function formatScore(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(3);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/**
 * Bucket labels are UTC on purpose: the export's timestamps are UTC, and a
 * local-time axis would silently shift every point.
 */
export function formatBucket(t: number, bucketMs: number): string {
  const date = new Date(t);
  if (bucketMs < 86_400_000) {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }
  return date.toLocaleDateString(undefined, {
    year: bucketMs >= 7 * 86_400_000 ? "numeric" : undefined,
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatPostTime(t: number | null): string {
  if (t == null) return "—";
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
