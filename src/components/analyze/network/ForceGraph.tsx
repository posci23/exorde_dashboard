"use client";

import { useMemo, useState } from "react";
import type { Graph, GraphNode } from "@/lib/analysis/network-derive";
import { formatCount, formatScore } from "@/lib/analysis/format";
import { useT } from "@/lib/i18n/locale";
import { BAND_COLOR, COMMUNITY_COLORS, GRID_COLOR } from "../palette";
import type { Bands } from "@/lib/analysis/types";
import { bandOf } from "@/lib/analysis/derive";

export type ColorBy = "sentiment" | "community";

/** Drawn in a 0–100 square and scaled by the SVG, so it fits any width. */
const BOX = 100;
const PADDING = 7;

/**
 * The graph itself.
 *
 * Positions come from the layout pass; this only draws. Colour carries one of
 * two meanings and says which in the legend: sentiment (the diverging pair
 * used everywhere else in the analyzer) or community (three validated hues,
 * with everything outside the three largest drawn hollow rather than given a
 * fourth colour that no colour-blind reader could separate).
 */
export function ForceGraph({
  graph,
  colorBy,
  bands,
  selected,
  onSelect,
}: {
  graph: Graph;
  colorBy: ColorBy;
  bands: Bands;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of graph.nodes) map.set(node.key, node);
    return map;
  }, [graph]);

  const focus = hovered ?? selected;
  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    for (const link of graph.links) {
      if (link.source === focus) set.add(link.target);
      if (link.target === focus) set.add(link.source);
    }
    return set;
  }, [focus, graph.links]);

  const maxStrength = graph.nodes.reduce((peak, node) => Math.max(peak, node.strength), 1);
  const showArrows = graph.links.length <= 60;

  const project = (value: number) => PADDING + value * (BOX - PADDING * 2);

  /**
   * Labels are placed greedily, strongest account first, and a label that
   * would land on one already placed is simply not drawn. Half-legible names
   * stacked on each other are worse than fewer names.
   */
  const labels = useMemo(() => {
    const placed: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const chosen: Array<{ key: string; x: number; y: number; text: string }> = [];
    const budget = graph.nodes.length > 60 ? 12 : 18;

    for (const node of graph.nodes) {
      if (chosen.length >= budget) break;
      const text = node.key.length > 18 ? `${node.key.slice(0, 17)}\u2026` : node.key;
      const x = PADDING + node.x * (BOX - PADDING * 2);
      const radius = 0.9 + Math.sqrt(node.strength / maxStrength) * 3.4;
      const y = PADDING + node.y * (BOX - PADDING * 2) - radius - 0.9;
      // Rough glyph metrics are enough: this only has to stop overlaps.
      const halfWidth = (text.length * 1.15) / 2;
      const box = { x1: x - halfWidth, y1: y - 2.4, x2: x + halfWidth, y2: y + 0.6 };
      if (box.x1 < 0 || box.x2 > BOX || box.y1 < 0) continue;
      const clash = placed.some(
        (other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
      );
      if (clash) continue;
      placed.push(box);
      chosen.push({ key: node.key, x, y, text });
    }
    return chosen;
  }, [graph.nodes, maxStrength]);

  const active = focus ? positions.get(focus) ?? null : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${BOX} ${BOX}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-[380px] w-full touch-pan-y sm:h-[520px]"
        role="img"
        aria-label={t.analyze.network.graphAria(
          formatCount(graph.metrics.nodes),
          formatCount(graph.metrics.edges),
        )}
        onClick={() => onSelect(null)}
      >
        {showArrows && (
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 6 6"
              refX="5.5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L6,3 L0,6 z" fill={GRID_COLOR} />
            </marker>
          </defs>
        )}

        <g>
          {graph.links.map((link, index) => {
            const source = positions.get(link.source);
            const target = positions.get(link.target);
            if (!source || !target) return null;
            const lit = !neighbours || (neighbours.has(link.source) && neighbours.has(link.target));
            return (
              <line
                key={`${link.source}-${link.target}-${link.kind}-${index}`}
                x1={project(source.x)}
                y1={project(source.y)}
                x2={project(target.x)}
                y2={project(target.y)}
                stroke={lit ? "#7aa8c8" : GRID_COLOR}
                strokeWidth={0.12 + Math.log1p(link.weight) * 0.18}
                strokeOpacity={lit ? 0.55 : 0.25}
                markerEnd={showArrows && lit ? "url(#graph-arrow)" : undefined}
              />
            );
          })}
        </g>

        <g>
          {graph.nodes.map((node) => {
            const lit = !neighbours || neighbours.has(node.key);
            const radius = 0.9 + Math.sqrt(node.strength / maxStrength) * 3.4;
            const { fill, stroke } = nodeColors(node, colorBy, bands);
            return (
              <circle
                key={node.key}
                cx={project(node.x)}
                cy={project(node.y)}
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={node.key === selected ? 0.8 : 0.35}
                opacity={lit ? 1 : 0.25}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(node.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(node.key === selected ? null : node.key);
                }}
              >
                <title>{`${node.key} — ${t.analyze.network.connections(formatCount(node.strength))}`}</title>
              </circle>
            );
          })}
        </g>

        <g className="pointer-events-none">
          {labels.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              fontSize={2.2}
              fill="#0c2d48"
              stroke="#ffffff"
              strokeWidth={0.6}
              paintOrder="stroke"
              opacity={!neighbours || neighbours.has(label.key) ? 1 : 0.25}
            >
              {label.text}
            </text>
          ))}
        </g>
      </svg>

      {active && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[15rem] rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-[var(--shadow-2)] backdrop-blur-sm">
          <div className="font-mono font-medium text-text">{active.key}</div>
          <dl className="mt-1 space-y-0.5 text-text-muted">
            <div className="flex justify-between gap-3">
              <dt>{t.analyze.network.received}</dt>
              <dd className="tnum">{formatCount(active.inDegree)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t.analyze.network.sent}</dt>
              <dd className="tnum">{formatCount(active.outDegree)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t.analyze.network.posts}</dt>
              <dd className="tnum">{formatCount(active.posts)}</dd>
            </div>
            {active.mean != null && (
              <div className="flex justify-between gap-3">
                <dt>{t.analyze.network.meanSentiment}</dt>
                <dd className="tnum">{formatScore(active.mean)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Accounts that only ever appear inside someone else's post have no sentiment
 * of their own, and no community worth claiming — they are drawn hollow, which
 * also keeps the palette to the three hues that pass the colour-blind checks.
 */
function nodeColors(node: GraphNode, colorBy: ColorBy, bands: Bands) {
  if (colorBy === "community") {
    const color = COMMUNITY_COLORS[node.community];
    return color
      ? { fill: color, stroke: "#ffffff" }
      : { fill: "#ffffff", stroke: "#7c8794" };
  }
  if (node.mean == null) return { fill: "#ffffff", stroke: "#7c8794" };
  return { fill: BAND_COLOR[bandOf(node.mean, bands)], stroke: "#ffffff" };
}
