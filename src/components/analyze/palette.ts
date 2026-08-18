/**
 * Chart colors for the sentiment analyzer.
 *
 * Positive / negative is *polarity*, so it takes a diverging pair — two poles
 * with a neutral gray midpoint — not two categorical hues. The obvious
 * green/red pair was rejected: under deuteranopia its separation measures
 * ΔE 5.6, below the ΔE 8 target, so a red-green reader would see one colour.
 * Cobalt (the product accent) against the danger red measures ΔE 23.0 under
 * protanopia and 32.2 with normal vision, and the gray midpoint clears both
 * poles. Band identity is also carried by label and position everywhere it
 * appears, so colour is never the only channel.
 */

import type { BandKey } from "@/lib/analysis/types";

export const BAND_COLOR: Record<BandKey, string> = {
  positive: "#004aad",
  neutral: "#7c8794",
  negative: "#b3261e",
};

/** Order used in every stack, legend and table: negative → neutral → positive. */
export const BAND_ORDER: BandKey[] = ["negative", "neutral", "positive"];

export const AXIS_COLOR = "#4a7394";
export const GRID_COLOR = "#e6f2f8";

export const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #b8d4e6",
  borderRadius: 12,
  color: "#0c2d48",
  fontSize: 12,
  boxShadow: "0 4px 12px 3px rgba(0, 74, 173, 0.1)",
} as const;
