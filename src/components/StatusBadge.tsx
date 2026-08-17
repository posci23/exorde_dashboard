export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "completed" || normalized === "healthy" || normalized === "connected"
      ? "bg-success/15 text-success"
      : normalized === "running" || normalized === "pending" || normalized === "validated"
        ? "bg-surface-container-high text-accent"
        : normalized === "failed" || normalized === "rejected" || normalized === "degraded"
          ? "bg-danger/15 text-danger"
          : "bg-warning/15 text-warning";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
