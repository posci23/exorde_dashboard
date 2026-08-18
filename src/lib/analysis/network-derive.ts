/**
 * Turning collected edges into a graph worth looking at.
 *
 * Everything here is pure and runs on the client: pick the edge kinds, keep
 * the accounts that carry the conversation, find communities, lay them out.
 * The collector's caps already bound the input, so this stays fast enough to
 * re-run whenever someone changes a control.
 */

import type { EdgeKind, NetworkAggregate } from "./network";

export type GraphMode = "accounts" | "keywords";

export type GraphOptions = {
  mode: GraphMode;
  /** Which edge kinds count, in accounts mode. */
  kinds: EdgeKind[];
  /** Cap on drawn nodes — a hairball is not a finding. */
  maxNodes: number;
  /** Drop edges lighter than this. */
  minWeight: number;
};

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = {
  mode: "accounts",
  kinds: ["retweet", "mention", "reply"],
  maxNodes: 120,
  minWeight: 1,
};

export type GraphNode = {
  key: string;
  /** Posts by this account inside the export. */
  posts: number;
  /** Mean sentiment of those posts, or null for an account only ever mentioned. */
  mean: number | null;
  inDegree: number;
  outDegree: number;
  /** Summed weight of every edge touching the node. */
  strength: number;
  community: number;
  x: number;
  y: number;
};

export type GraphLink = {
  source: string;
  target: string;
  kind: EdgeKind | "cooccurrence";
  weight: number;
  /** Mean sentiment of the posts that made this edge. */
  mean: number;
};

export type GraphMetrics = {
  nodes: number;
  edges: number;
  /** Edges as a share of every edge that could exist. */
  density: number;
  /** Share of edges whose reverse also exists — conversation, not broadcast. */
  reciprocity: number;
  meanDegree: number;
  components: number;
  /** Share of drawn nodes inside the largest component. */
  largestComponentShare: number;
  communities: number;
  /** The busiest account's share of all edge endpoints. */
  concentration: number;
};

export type Graph = {
  nodes: GraphNode[];
  links: GraphLink[];
  metrics: GraphMetrics;
  /** Sizes of the communities found, largest first. */
  communitySizes: number[];
  /** True when nodes were dropped to respect `maxNodes`. */
  trimmed: boolean;
  totalNodes: number;
};

const EMPTY_METRICS: GraphMetrics = {
  nodes: 0,
  edges: 0,
  density: 0,
  reciprocity: 0,
  meanDegree: 0,
  components: 0,
  largestComponentShare: 0,
  communities: 0,
  concentration: 0,
};

export function buildGraph(network: NetworkAggregate, options: GraphOptions): Graph {
  const raw: GraphLink[] =
    options.mode === "keywords"
      ? network.keywordEdges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          kind: "cooccurrence" as const,
          weight: edge.weight,
          mean: edge.sentSum / edge.weight,
        }))
      : network.edges
          .filter((edge) => options.kinds.includes(edge.kind))
          .map((edge) => ({
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            weight: edge.weight,
            mean: edge.sentSum / edge.weight,
          }));

  const edges = raw.filter((edge) => edge.weight >= options.minWeight);
  if (edges.length === 0) {
    return { nodes: [], links: [], metrics: EMPTY_METRICS, communitySizes: [], trimmed: false, totalNodes: 0 };
  }

  // Rank accounts by how much traffic touches them, then keep the top slice.
  const strength = new Map<string, number>();
  for (const edge of edges) {
    strength.set(edge.source, (strength.get(edge.source) ?? 0) + edge.weight);
    strength.set(edge.target, (strength.get(edge.target) ?? 0) + edge.weight);
  }
  const ranked = [...strength.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const kept = new Set(ranked.slice(0, options.maxNodes).map(([key]) => key));
  const links = edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target));

  const stats = new Map<string, { in: number; out: number }>();
  for (const key of kept) stats.set(key, { in: 0, out: 0 });
  for (const link of links) {
    stats.get(link.source)!.out += link.weight;
    stats.get(link.target)!.in += link.weight;
  }

  const posted = new Map(network.nodes.map((node) => [node.key, node]));
  const nodes: GraphNode[] = [...kept].map((key) => {
    const node = posted.get(key);
    const degree = stats.get(key)!;
    return {
      key,
      posts: node?.posts ?? 0,
      mean: node && node.sentCount > 0 ? node.sentSum / node.sentCount : null,
      inDegree: degree.in,
      outDegree: degree.out,
      strength: degree.in + degree.out,
      community: 0,
      x: 0,
      y: 0,
    };
  });
  // A stable order keeps community labels and the layout reproducible.
  nodes.sort((a, b) => b.strength - a.strength || a.key.localeCompare(b.key));

  const index = new Map(nodes.map((node, i) => [node.key, i]));
  const communities = findCommunities(nodes.length, links, index);
  communities.labels.forEach((label, i) => {
    nodes[i].community = label;
  });

  layout(nodes, links, index);

  return {
    nodes,
    links,
    metrics: measure(nodes, links, index),
    communitySizes: communities.sizes,
    trimmed: ranked.length > nodes.length,
    totalNodes: ranked.length,
  };
}

/**
 * Label propagation: each node takes the label carried by the most edge weight
 * around it, repeatedly, until nothing moves. Cheap, and good enough to show
 * that a conversation has sides. Ties break on the lower label so two runs on
 * the same data agree.
 */
function findCommunities(
  count: number,
  links: GraphLink[],
  index: Map<string, number>,
): { labels: number[]; sizes: number[] } {
  const neighbours: Array<Array<[number, number]>> = Array.from({ length: count }, () => []);
  for (const link of links) {
    const a = index.get(link.source)!;
    const b = index.get(link.target)!;
    if (a === b) continue;
    neighbours[a].push([b, link.weight]);
    neighbours[b].push([a, link.weight]);
  }

  let labels = Array.from({ length: count }, (_, i) => i);
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < count; i++) {
      if (neighbours[i].length === 0) continue;
      const totals = new Map<number, number>();
      for (const [j, weight] of neighbours[i]) {
        totals.set(labels[j], (totals.get(labels[j]) ?? 0) + weight);
      }
      let best = labels[i];
      let bestWeight = -1;
      for (const [label, weight] of [...totals.entries()].sort((a, b) => a[0] - b[0])) {
        if (weight > bestWeight) {
          best = label;
          bestWeight = weight;
        }
      }
      if (best !== labels[i]) {
        labels[i] = best;
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Renumber so community 0 is the largest — the legend reads by size.
  const counts = new Map<number, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  const order = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const renumber = new Map(order.map(([label], i) => [label, i]));
  labels = labels.map((label) => renumber.get(label)!);

  return { labels, sizes: order.map(([, size]) => size) };
}

/** Deterministic pseudo-random numbers, so a graph looks the same twice. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fruchterman–Reingold, in a unit box. Node count is capped well below the
 * point where the all-pairs repulsion would hurt, so there is no need for a
 * quadtree — and none of the non-determinism that comes with one.
 */
function layout(nodes: GraphNode[], links: GraphLink[], index: Map<string, number>) {
  const n = nodes.length;
  if (n === 0) return;
  if (n === 1) {
    nodes[0].x = 0.5;
    nodes[0].y = 0.5;
    return;
  }

  const random = seeded(0x5ee5);
  const radius = 0.35;
  for (let i = 0; i < n; i++) {
    // Start on a ring, communities together, with a little jitter to break symmetry.
    const angle = (i / n) * Math.PI * 2 + nodes[i].community * 0.6;
    nodes[i].x = 0.5 + Math.cos(angle) * radius * (0.6 + random() * 0.4);
    nodes[i].y = 0.5 + Math.sin(angle) * radius * (0.6 + random() * 0.4);
  }

  const k = Math.sqrt(1 / n) * 0.9;
  const iterations = n > 150 ? 220 : 320;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const edges = links.map((link) => ({
    a: index.get(link.source)!,
    b: index.get(link.target)!,
    // Heavier edges pull harder, but logarithmically — one viral retweet
    // shouldn't collapse the whole layout onto a point.
    pull: 1 + Math.log1p(link.weight),
  }));

  for (let step = 0; step < iterations; step++) {
    dx.fill(0);
    dy.fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = nodes[i].x - nodes[j].x;
        let vy = nodes[i].y - nodes[j].y;
        let distance = Math.hypot(vx, vy);
        if (distance < 1e-4) {
          vx = (random() - 0.5) * 1e-3;
          vy = (random() - 0.5) * 1e-3;
          distance = Math.hypot(vx, vy) || 1e-4;
        }
        const force = (k * k) / distance;
        const fx = (vx / distance) * force;
        const fy = (vy / distance) * force;
        dx[i] += fx;
        dy[i] += fy;
        dx[j] -= fx;
        dy[j] -= fy;
      }
    }

    for (const edge of edges) {
      const vx = nodes[edge.a].x - nodes[edge.b].x;
      const vy = nodes[edge.a].y - nodes[edge.b].y;
      const distance = Math.hypot(vx, vy) || 1e-4;
      const force = ((distance * distance) / k) * edge.pull * 0.35;
      const fx = (vx / distance) * force;
      const fy = (vy / distance) * force;
      dx[edge.a] -= fx;
      dy[edge.a] -= fy;
      dx[edge.b] += fx;
      dy[edge.b] += fy;
    }

    const temperature = 0.1 * (1 - step / iterations) + 0.002;
    for (let i = 0; i < n; i++) {
      // Gravity keeps loose satellites from drifting off the canvas.
      dx[i] += (0.5 - nodes[i].x) * 0.02;
      dy[i] += (0.5 - nodes[i].y) * 0.02;

      const distance = Math.hypot(dx[i], dy[i]) || 1e-9;
      const move = Math.min(distance, temperature);
      nodes[i].x += (dx[i] / distance) * move;
      nodes[i].y += (dy[i] / distance) * move;
    }
  }

  normalize(nodes);
  separate(nodes);
}

/**
 * Push overlapping circles apart.
 *
 * Fruchterman–Reingold balances forces, not areas: on a sparse graph — a
 * hundred accounts joined by fifty retweets — connected pairs settle close
 * enough that their drawn circles sit on top of each other and read as one
 * smudged blob. This pass works in the same units the graph is drawn in, so
 * "overlapping" means what it looks like.
 */
function separate(nodes: GraphNode[]) {
  const n = nodes.length;
  if (n < 2) return;

  const maxStrength = nodes.reduce((peak, node) => Math.max(peak, node.strength), 1);
  // Mirrors the radius the renderer uses, converted from its 0–100 box.
  const radius = nodes.map(
    (node) => (0.9 + Math.sqrt(node.strength / maxStrength) * 3.4 + 0.6) / 86,
  );

  // Leave a margin so nodes pushed outward still have somewhere to go.
  for (const node of nodes) {
    node.x = 0.03 + node.x * 0.94;
    node.y = 0.03 + node.y * 0.94;
  }

  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const minimum = radius[i] + radius[j];
        let vx = nodes[j].x - nodes[i].x;
        let vy = nodes[j].y - nodes[i].y;
        let distance = Math.hypot(vx, vy);
        if (distance >= minimum) continue;
        if (distance < 1e-6) {
          // Exactly coincident: pick a direction so they can part at all.
          vx = ((i % 2 === 0 ? 1 : -1) * (i + 1)) % 7 || 1;
          vy = ((j % 3 === 0 ? 1 : -1) * (j + 1)) % 5 || 1;
          distance = Math.hypot(vx, vy);
        }
        const push = (minimum - distance) / 2;
        const ux = (vx / distance) * push;
        const uy = (vy / distance) * push;
        nodes[i].x -= ux;
        nodes[i].y -= uy;
        nodes[j].x += ux;
        nodes[j].y += uy;
        // Clamp inside the loop, not after it: a node pinned to the edge has
        // to be resolvable sideways on the next pass, which a final clamp
        // would prevent by re-introducing the overlap it just fixed.
        clamp(nodes[i], radius[i]);
        clamp(nodes[j], radius[j]);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function clamp(node: GraphNode, radius: number) {
  node.x = Math.min(1 - radius, Math.max(radius, node.x));
  node.y = Math.min(1 - radius, Math.max(radius, node.y));
}

/** Fit the drawing to the unit box, whatever scale the simulation settled at. */
function normalize(nodes: GraphNode[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  for (const node of nodes) {
    node.x = (node.x - minX) / spanX;
    node.y = (node.y - minY) / spanY;
  }
}

function measure(nodes: GraphNode[], links: GraphLink[], index: Map<string, number>): GraphMetrics {
  const n = nodes.length;
  if (n === 0) return EMPTY_METRICS;

  const seen = new Set(links.map((link) => `${link.source} ${link.target}`));
  let reciprocal = 0;
  for (const link of links) {
    if (seen.has(`${link.target} ${link.source}`)) reciprocal++;
  }

  // Union-find over the undirected graph, for component counts.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const link of links) {
    const a = find(index.get(link.source)!);
    const b = find(index.get(link.target)!);
    if (a !== b) parent[a] = b;
  }
  const sizes = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }

  const totalStrength = nodes.reduce((sum, node) => sum + node.strength, 0);
  const possible = n * (n - 1);

  return {
    nodes: n,
    edges: links.length,
    density: possible ? links.length / possible : 0,
    reciprocity: links.length ? reciprocal / links.length : 0,
    meanDegree: (2 * links.length) / n,
    components: sizes.size,
    largestComponentShare: Math.max(...sizes.values()) / n,
    communities: new Set(nodes.map((node) => node.community)).size,
    concentration: totalStrength ? (nodes[0]?.strength ?? 0) / totalStrength : 0,
  };
}

export type AccountRow = {
  key: string;
  posts: number;
  mean: number | null;
  received: number;
  sent: number;
};

/** The accounts a client asks about first: most talked about, most active. */
export function topAccounts(
  network: NetworkAggregate,
  kinds: EdgeKind[],
  sort: "received" | "sent" | "posts",
  limit: number,
): AccountRow[] {
  const received = new Map<string, number>();
  const sent = new Map<string, number>();
  for (const edge of network.edges) {
    if (!kinds.includes(edge.kind)) continue;
    received.set(edge.target, (received.get(edge.target) ?? 0) + edge.weight);
    sent.set(edge.source, (sent.get(edge.source) ?? 0) + edge.weight);
  }

  const keys = new Set<string>([...received.keys(), ...sent.keys()]);
  for (const node of network.nodes) if (node.posts > 0) keys.add(node.key);

  const posted = new Map(network.nodes.map((node) => [node.key, node]));
  const rows: AccountRow[] = [...keys].map((key) => {
    const node = posted.get(key);
    return {
      key,
      posts: node?.posts ?? 0,
      mean: node && node.sentCount > 0 ? node.sentSum / node.sentCount : null,
      received: received.get(key) ?? 0,
      sent: sent.get(key) ?? 0,
    };
  });

  rows.sort((a, b) => b[sort] - a[sort] || a.key.localeCompare(b.key));
  return rows.slice(0, limit);
}

export type ThreadStats = {
  /** Reply edges that resolved to a parent inside the export. */
  resolved: number;
  /** Replies to the account's own earlier post: a thread, not a conversation. */
  selfReplies: number;
  unresolved: number;
  /** Conversations: connected groups of accounts linked by replies. */
  conversations: number;
  largestConversation: number;
  /** Accounts drawing the most replies. */
  mostReplied: Array<{ key: string; replies: number; mean: number }>;
};

export function threadStats(network: NetworkAggregate): ThreadStats {
  const replies = network.edges.filter((edge) => edge.kind === "reply");
  const received = new Map<string, { replies: number; sentSum: number }>();

  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const seen = parent.get(key);
    if (seen === undefined) {
      parent.set(key, key);
      return key;
    }
    if (seen === key) return key;
    const root = find(seen);
    parent.set(key, root);
    return root;
  };

  for (const edge of replies) {
    const entry = received.get(edge.target) ?? { replies: 0, sentSum: 0 };
    entry.replies += edge.weight;
    entry.sentSum += edge.sentSum;
    received.set(edge.target, entry);

    const a = find(edge.source);
    const b = find(edge.target);
    if (a !== b) parent.set(a, b);
  }

  const groups = new Map<string, number>();
  for (const key of parent.keys()) {
    const root = find(key);
    groups.set(root, (groups.get(root) ?? 0) + 1);
  }

  return {
    resolved: network.stats.replyEdges,
    selfReplies: network.stats.selfReplies,
    unresolved: network.stats.repliesUnresolved,
    conversations: groups.size,
    largestConversation: groups.size ? Math.max(...groups.values()) : 0,
    mostReplied: [...received.entries()]
      .map(([key, value]) => ({ key, replies: value.replies, mean: value.sentSum / value.replies }))
      .sort((a, b) => b.replies - a.replies || a.key.localeCompare(b.key))
      .slice(0, 8),
  };
}
