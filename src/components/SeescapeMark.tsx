/** Search lens + horizon: a compact mark that stays legible at navigation-rail size. */
function SeescapeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="14" cy="14" r="7.25" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M8.2 14.7c1.45-1.1 2.75-1.1 4.2 0s2.75 1.1 4.2 0c1.05-.8 2.02-1.01 3-.62"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m19.35 19.35 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="10.55" r="1.15" fill="var(--seafoam)" />
    </svg>
  );
}

/** Seescape wordmark — product glyph plus an optional Material-aligned wordmark. */
export function SeescapeMark({
  size = "md",
  showName = false,
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}) {
  const sizes = {
    sm: { box: "h-9 w-9 rounded-xl", icon: "h-6 w-6", name: "text-lg" },
    md: { box: "h-10 w-10 rounded-[14px]", icon: "h-7 w-7", name: "text-xl" },
    lg: {
      box: "h-14 w-14 rounded-[18px] sm:h-16 sm:w-16 sm:rounded-[20px]",
      icon: "h-9 w-9 sm:h-10 sm:w-10",
      name: "text-2xl sm:text-3xl",
    },
  }[size];

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${sizes.box} flex shrink-0 items-center justify-center bg-accent-solid text-accent-fg shadow-[var(--shadow-2)]`}
        aria-hidden
      >
        <SeescapeGlyph className={sizes.icon} />
      </span>
      {showName && (
        <span className={`font-sans font-semibold tracking-[-0.025em] text-accent ${sizes.name}`}>
          Seescape
        </span>
      )}
    </span>
  );
}
