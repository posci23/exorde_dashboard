"use client";

/** Seescape wordmark — wave mark + product name for the nav and hero. */
export function SeescapeMark({
  size = "md",
  showName = false,
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const sizes = {
    sm: { box: "h-9 w-9", icon: 18, text: "text-sm" },
    md: { box: "h-10 w-10", icon: 20, text: "text-base" },
    lg: { box: "h-14 w-14", icon: 28, text: "text-xl" },
  }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${showName ? "" : ""}`}>
      <span
        className={`${sizes.box} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-hover shadow-[var(--shadow-2)]`}
        aria-hidden
      >
        <svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none">
          <path
            d="M2 14c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 18c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
      </span>
      {showName && (
        <span className={`font-display text-4xl font-semibold tracking-tight text-accent ${sizes.text}`}>
          Seescape
        </span>
      )}
    </span>
  );
}
