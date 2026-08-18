/**
 * Getting an aggregate across the wire.
 *
 * Histograms are typed arrays, which `JSON.stringify` turns into objects keyed
 * by index — lossy and enormous. They are also mostly zeroes, so they travel
 * as sparse `[bin, count, bin, count, …]` pairs instead: a bucket holding a
 * dozen distinct scores costs a couple of dozen numbers rather than 201.
 *
 * The server also trims before sending. A day-long export can hold twenty
 * thousand hourly buckets and a thousand keywords; the dashboard draws neither
 * at that depth, and the client-side path keeps the full detail anyway.
 */

import { BINS, type Aggregate, type Binned, type GroupBin, type TimeBin } from "./types";

type PackedBinned = { h: number[]; c: number; s: number };
type PackedGroup = PackedBinned & { k: string };
type PackedTime = PackedBinned & { t: number };

export type WireAggregate = Omit<
  Aggregate,
  "total" | "time" | "groups" | "emotions" | "keywords"
> & {
  total: PackedBinned & { min: number; max: number };
  time: PackedTime[];
  groups: Record<"domain" | "language" | "classification" | "author", PackedGroup[]>;
  emotions: { names: string[]; sums: number[]; counts: number[] };
  keywords: PackedGroup[];
};

export type WireLimits = {
  timeBuckets: number;
  groups: number;
  keywords: number;
  networkNodes: number;
  networkEdges: number;
};

export const DEFAULT_WIRE_LIMITS: WireLimits = {
  timeBuckets: 2_000,
  groups: 100,
  keywords: 400,
  // The graph view draws at most a few hundred nodes; sending tens of
  // thousands of edges would cost more than it could ever show.
  networkNodes: 3_000,
  networkEdges: 6_000,
};

function packHist(hist: Int32Array): number[] {
  const packed: number[] = [];
  for (let bin = 0; bin < BINS; bin++) {
    const count = hist[bin];
    if (count) packed.push(bin, count);
  }
  return packed;
}

function unpackHist(packed: number[]): Int32Array {
  const hist = new Int32Array(BINS);
  for (let i = 0; i < packed.length; i += 2) hist[packed[i]] = packed[i + 1];
  return hist;
}

function packBinned(binned: Binned): PackedBinned {
  return { h: packHist(binned.hist), c: binned.count, s: binned.sum };
}

function unpackBinned(packed: PackedBinned): Binned {
  return { hist: unpackHist(packed.h), count: packed.c, sum: packed.s };
}

/** Merge adjacent time buckets until there are no more than `max` of them. */
function foldTime(time: TimeBin[], bucketMs: number, max: number): { time: TimeBin[]; bucketMs: number } {
  if (time.length <= max || time.length === 0) return { time, bucketMs };

  const span = time[time.length - 1].t - time[0].t + bucketMs;
  const target = Math.ceil(span / max / bucketMs) * bucketMs;

  const merged = new Map<number, TimeBin>();
  for (const bucket of time) {
    const key = Math.floor(bucket.t / target) * target;
    let entry = merged.get(key);
    if (!entry) {
      entry = { t: key, hist: new Int32Array(BINS), count: 0, sum: 0 };
      merged.set(key, entry);
    }
    for (let i = 0; i < BINS; i++) entry.hist[i] += bucket.hist[i];
    entry.count += bucket.count;
    entry.sum += bucket.sum;
  }

  return {
    time: [...merged.values()].sort((a, b) => a.t - b.t),
    bucketMs: target,
  };
}

export function packAggregate(
  aggregate: Aggregate,
  limits: WireLimits = DEFAULT_WIRE_LIMITS,
): WireAggregate {
  const folded = foldTime(aggregate.time, aggregate.bucketMs, limits.timeBuckets);
  const packGroups = (groups: GroupBin[]) =>
    groups.slice(0, limits.groups).map((group) => ({ k: group.key, ...packBinned(group) }));

  return {
    ...aggregate,
    bucketMs: folded.bucketMs,
    total: { ...packBinned(aggregate.total), min: aggregate.total.min, max: aggregate.total.max },
    time: folded.time.map((bucket) => ({ t: bucket.t, ...packBinned(bucket) })),
    groups: {
      domain: packGroups(aggregate.groups.domain),
      language: packGroups(aggregate.groups.language),
      classification: packGroups(aggregate.groups.classification),
      author: packGroups(aggregate.groups.author),
    },
    emotions: {
      names: aggregate.emotions.names,
      sums: Array.from(aggregate.emotions.sums),
      counts: Array.from(aggregate.emotions.counts),
    },
    keywords: aggregate.keywords.slice(0, limits.keywords).map((keyword) => ({
      k: keyword.key,
      ...packBinned(keyword),
    })),
    network: trimNetwork(aggregate.network, limits),
  };
}

/**
 * Keep the heaviest edges, then the nodes those edges (and the busiest
 * accounts) actually need. Trimming edges first means the graph that arrives
 * is a connected view of the strongest activity rather than a random slice.
 */
function trimNetwork(network: Aggregate["network"], limits: WireLimits): Aggregate["network"] {
  if (network.edges.length <= limits.networkEdges && network.nodes.length <= limits.networkNodes) {
    return network;
  }

  const edges = [...network.edges]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limits.networkEdges);
  const needed = new Set<string>();
  for (const edge of edges) {
    needed.add(edge.source);
    needed.add(edge.target);
  }

  const ranked = [...network.nodes].sort((a, b) => b.posts - a.posts);
  const nodes = ranked.filter((node) => needed.has(node.key));
  for (const node of ranked) {
    if (nodes.length >= limits.networkNodes) break;
    if (!needed.has(node.key)) nodes.push(node);
  }

  return {
    nodes: nodes.slice(0, limits.networkNodes),
    edges,
    keywordEdges: [...network.keywordEdges]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limits.networkEdges),
    stats: network.stats,
  };
}

export function unpackAggregate(wire: WireAggregate): Aggregate {
  const unpackGroups = (groups: PackedGroup[]): GroupBin[] =>
    groups.map((group) => ({ key: group.k, ...unpackBinned(group) }));

  return {
    ...wire,
    total: { ...unpackBinned(wire.total), min: wire.total.min, max: wire.total.max },
    time: wire.time.map((bucket) => ({ t: bucket.t, ...unpackBinned(bucket) })),
    groups: {
      domain: unpackGroups(wire.groups.domain),
      language: unpackGroups(wire.groups.language),
      classification: unpackGroups(wire.groups.classification),
      author: unpackGroups(wire.groups.author),
    },
    emotions: {
      names: wire.emotions.names,
      sums: Float64Array.from(wire.emotions.sums),
      counts: Int32Array.from(wire.emotions.counts),
    },
    keywords: wire.keywords.map((keyword) => ({ key: keyword.k, ...unpackBinned(keyword) })),
  };
}
