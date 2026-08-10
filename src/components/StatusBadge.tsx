export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "completed" || normalized === "healthy" || normalized === "connected"
      ? "bg-success/15 text-success"
      : normalized === "running" || normalized === "pending" || normalized === "validated"
        ? "bg-info/15 text-info"
        : normalized === "failed" || normalized === "rejected" || normalized === "degraded"
          ? "bg-danger/15 text-danger"
          : "bg-warning/15 text-warning";

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
