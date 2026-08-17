"use client";

/** Seescape wordmark — SS monogram + product name for the nav and hero. */
export function SeescapeMark({
  size = "md",
  showName = false,
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const sizes = {
    sm: { box: "h-9 w-9", mono: "text-xs", name: "text-lg" },
    md: { box: "h-10 w-10", mono: "text-sm", name: "text-xl" },
    lg: { box: "h-14 w-14 sm:h-16 sm:w-16", mono: "text-base sm:text-lg", name: "text-2xl sm:text-3xl" },
  }[size];

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${sizes.box} flex shrink-0 items-center justify-center rounded-2xl bg-accent-solid shadow-[var(--shadow-2)]`}
        aria-hidden
      >
        <span className={`font-display font-bold leading-none tracking-tight text-accent-fg ${sizes.mono}`}>
          SS
        </span>
      </span>
      {showName && (
        <span className={`font-display font-semibold tracking-tight text-accent ${sizes.name}`}>
          Seescape
        </span>
      )}
    </span>
  );
}
